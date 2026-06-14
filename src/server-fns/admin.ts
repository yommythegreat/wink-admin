import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  AdminUserRow,
  AdminReportRow,
  AdminBlockRow,
  AdminSubscriptionRow,
  AdminDashboardStats,
  AdminRoleValue,
  AdminAdminRow,
  AdminDeletedUserRow,
} from "@/integrations/supabase/admin-types";

// ─────────────────────────────────────────────────────────────────────────────
// Inlined server-only helpers (cannot be imported from a shared module because
// TanStack Start's import-protection plugin can't mock transitive imports)
// ─────────────────────────────────────────────────────────────────────────────

type AdminRoleValueInternal = "SUPER_ADMIN" | "ADMIN";
type AdminUserInternal = { userId: string; email: string | undefined; role: AdminRoleValueInternal };

async function requireAdminUser(token: string): Promise<AdminUserInternal> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  const { data: row } = await supabaseAdmin
    .from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!row) throw new Error("Forbidden");
  return { userId: user.id, email: user.email, role: row.role as AdminRoleValueInternal };
}

async function logAdminAction(params: {
  adminId: string; action: string; targetType: string; targetId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: params.adminId, action: params.action,
    target_type: params.targetType, target_id: params.targetId,
    payload: params.payload ?? null,
  });
  if (error) console.error("[admin-audit]", error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth / role check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight role check — does NOT throw on failure; just returns isAdmin flag.
 * Used in _admin.tsx beforeLoad for client-side redirect.
 * Real security enforcement happens via requireAdminUser() in every mutation.
 */
export const checkAdminRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<{ isAdmin: boolean; role: AdminRoleValue | null }> => {
    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(data.token);
      if (error || !user) return { isAdmin: false, role: null };

      const { data: row } = await supabaseAdmin
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!row) return { isAdmin: false, role: null };
      return { isAdmin: true, role: row.role as AdminRoleValue };
    } catch {
      return { isAdmin: false, role: null };
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminDashboardStats = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminDashboardStats> => {
    await requireAdminUser(data.token);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all count queries in parallel
    const [
      { count: totalUsers },
      { count: paidUsers },
      { count: activeToday },
      { count: pendingReports },
      { count: totalWinks },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_paid", true),
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen_at", yesterday),
      supabaseAdmin
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin.from("winks").select("*", { count: "exact", head: true }),
    ]);

    // Signups by day (last 30 days) — query auth.users via profiles.created_at
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });

    // Bucket by day
    const dayBuckets: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      dayBuckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const p of profilesData ?? []) {
      const day = p.created_at.slice(0, 10);
      if (day in dayBuckets) dayBuckets[day]++;
    }
    const signupsByDay = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

    // Revenue by tier — from profiles with active subscriptions
    const { data: subsData } = await supabaseAdmin
      .from("profiles")
      .select("plan_tier")
      .eq("subscription_status", "active")
      .not("plan_tier", "is", null);

    const tierCounts: Record<string, number> = { weekly: 0, monthly: 0, yearly: 0 };
    for (const s of subsData ?? []) {
      if (s.plan_tier && s.plan_tier in tierCounts) tierCounts[s.plan_tier]++;
    }
    // MRR: weekly≈$8.67/mo (×4.33), monthly=$6, yearly=$50/12≈$4.17
    const mrrPerTier: Record<string, number> = { weekly: 8.67, monthly: 6, yearly: 4.17 };
    const revenueByTier = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      mrr: Math.round(count * (mrrPerTier[tier] ?? 0) * 100) / 100,
    }));

    return {
      totalUsers: totalUsers ?? 0,
      paidUsers: paidUsers ?? 0,
      activeToday: activeToday ?? 0,
      pendingReports: pendingReports ?? 0,
      totalWinks: totalWinks ?? 0,
      signupsByDay,
      revenueByTier,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// User management
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminUsers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(25),
      search: z.string().optional(),
      filter: z.enum(["all", "paid", "free", "live"]).default("all"),
    }),
  )
  .handler(async ({ data }): Promise<{ users: AdminUserRow[]; total: number }> => {
    await requireAdminUser(data.token);

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;

    // Exclude admin accounts from the user list
    const { data: adminRoleIds } = await supabaseAdmin
      .from("admin_roles")
      .select("user_id");
    const adminIds = (adminRoleIds ?? []).map((r) => r.user_id);

    let query = supabaseAdmin
      .from("profiles")
      .select(
        // `intent` was dropped on 2026-06-01 by migration 20260601000001_drop_intent.sql;
        // selecting it was 500ing the whole query and rendering this page empty.
        `id, display_name, avatar_url, bio, birthdate, gender,
         is_live, last_seen_at, onboarding_completed, created_at`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (adminIds.length > 0) {
      query = query.not("id", "in", `(${adminIds.join(",")})`);
    }

    if (data.filter === "paid") {
      // profiles doesn't have is_paid in types.ts yet, use raw column
      query = query.eq("is_paid" as never, true);
    } else if (data.filter === "free") {
      query = query.eq("is_paid" as never, false);
    } else if (data.filter === "live") {
      query = query.eq("is_live", true);
    }

    const { data: profiles, count, error } = await query;
    if (error) throw error;

    // Fetch subscription data separately (columns not in generated types)
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: subProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, is_paid, plan_tier, subscription_status, subscription_period_end")
      .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const subMap = new Map(
      (subProfiles ?? []).map((p) => [p.id, p]),
    );

    // Fetch report counts per user
    const { data: reportCounts } = await supabaseAdmin
      .from("reports")
      .select("reported_person_id")
      .in(
        "reported_person_id",
        ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"],
      );

    const reportMap: Record<string, number> = {};
    for (const r of reportCounts ?? []) {
      reportMap[r.reported_person_id] = (reportMap[r.reported_person_id] ?? 0) + 1;
    }

    // Fetch admin roles
    const { data: adminRoles } = await supabaseAdmin
      .from("admin_roles")
      .select("user_id, role")
      .in("user_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const roleMap = new Map((adminRoles ?? []).map((r) => [r.user_id, r.role]));

    // Fetch emails from auth.users via admin API (listUsers is paginated)
    const emailMap = new Map<string, string>();
    const lastSignInMap = new Map<string, string>();
    if (ids.length > 0) {
      // Use filter to fetch specific users — listUsers doesn't support IN filter,
      // so we fetch and build a map from the full result (capped at 1000)
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of authData?.users ?? []) {
        emailMap.set(u.id, u.email ?? "");
        lastSignInMap.set(u.id, u.last_sign_in_at ?? "");
      }
    }

    // Apply search filter (client-side after fetch because we need email from auth.users)
    let rows: AdminUserRow[] = (profiles ?? []).map((p) => {
      const sub = subMap.get(p.id);
      return {
        id: p.id,
        email: emailMap.get(p.id) ?? null,
        created_at: p.created_at,
        last_sign_in_at: lastSignInMap.get(p.id) ?? null,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        birthdate: p.birthdate,
        gender: p.gender,
        is_live: p.is_live,
        is_paid: (sub as { is_paid?: boolean } | undefined)?.is_paid ?? false,
        plan_tier: (sub as { plan_tier?: string | null } | undefined)?.plan_tier ?? null,
        subscription_status:
          (sub as { subscription_status?: string | null } | undefined)?.subscription_status ?? null,
        subscription_period_end:
          (sub as { subscription_period_end?: string | null } | undefined)
            ?.subscription_period_end ?? null,
        last_seen_at: p.last_seen_at,
        onboarding_completed: p.onboarding_completed,
        report_count: reportMap[p.id] ?? 0,
        admin_role: (roleMap.get(p.id) as AdminRoleValue) ?? null,
      };
    });

    if (data.search) {
      const q = data.search.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }

    return { users: rows, total: count ?? 0 };
  });

export const getAdminUserDetail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), userId: z.string() }))
  .handler(async ({ data }): Promise<AdminUserRow & {
    wink_sent: number;
    wink_received: number;
    block_count: number;
  }> => {
    await requireAdminUser(data.token);

    const [
      { data: profile },
      { data: authUser },
      { count: winkSent },
      { count: winkReceived },
      { count: reportCount },
      { count: blockCount },
      { data: adminRole },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(data.userId),
      supabaseAdmin
        .from("winks")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", data.userId),
      supabaseAdmin
        .from("winks")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", data.userId),
      supabaseAdmin
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reported_person_id", data.userId),
      supabaseAdmin
        .from("blocks")
        .select("*", { count: "exact", head: true })
        .eq("blocked_id", data.userId),
      supabaseAdmin
        .from("admin_roles")
        .select("role")
        .eq("user_id", data.userId)
        .maybeSingle(),
    ]);

    if (!profile) throw new Error("User not found");

    const p = profile as unknown as {
      gender?: string;
      is_paid?: boolean;
      plan_tier?: string | null;
      subscription_status?: string | null;
      subscription_period_end?: string | null;
      phone?: string | null;
      instagram_url?: string | null;
      x_url?: string | null;
      tiktok_url?: string | null;
      total_live_count?: number;
    };

    return {
      id: data.userId,
      email: authUser.user?.email ?? null,
      email_confirmed_at: authUser.user?.email_confirmed_at ?? null,
      created_at: profile.created_at,
      last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      birthdate: profile.birthdate,
      gender: p.gender ?? null,
      is_live: profile.is_live,
      is_banned: (profile as unknown as { is_banned?: boolean }).is_banned ?? false,
      is_paid: p.is_paid ?? false,
      plan_tier: p.plan_tier ?? null,
      subscription_status: p.subscription_status ?? null,
      subscription_period_end: p.subscription_period_end ?? null,
      last_seen_at: profile.last_seen_at,
      onboarding_completed: profile.onboarding_completed,
      report_count: reportCount ?? 0,
      admin_role: (adminRole?.role as AdminRoleValue) ?? null,
      phone: p.phone ?? null,
      instagram_url: p.instagram_url ?? null,
      x_url: p.x_url ?? null,
      tiktok_url: p.tiktok_url ?? null,
      total_live_count: p.total_live_count ?? 0,
      wink_sent: winkSent ?? 0,
      wink_received: winkReceived ?? 0,
      block_count: blockCount ?? 0,
    };
  });

export const updateAdminUserProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      userId: z.string(),
      display_name: z.string().optional(),
      bio: z.string().nullable().optional(),
      birthdate: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");
    const { token: _t, userId, ...updates } = data;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: "update_profile",
      targetType: "user",
      targetId: userId,
      payload: updates as Record<string, unknown>,
    });
  });

export const banUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), userId: z.string(), reason: z.string() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_banned: true, is_live: false })
      .eq("id", data.userId);
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: "ban_user",
      targetType: "user",
      targetId: data.userId,
      payload: { reason: data.reason },
    });
  });

export const unbanUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_banned: false })
      .eq("id", data.userId);
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: "unban_user",
      targetType: "user",
      targetId: data.userId,
    });
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    // Fetch email before deletion so we can blocklist it.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = authUser.user?.email;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;

    // Block the email so the person cannot re-register or log back in.
    if (email) {
      await supabaseAdmin
        .from("deleted_emails")
        .upsert({ email: email.toLowerCase() }, { onConflict: "email" });
    }

    await logAdminAction({
      adminId: admin.userId,
      action: "delete_user",
      targetType: "user",
      targetId: data.userId,
    });
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      targetUserId: z.string(),
      role: z.enum(["SUPER_ADMIN", "ADMIN"]),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    const { error } = await supabaseAdmin
      .from("admin_roles")
      .upsert({ user_id: data.targetUserId, role: data.role, created_by: admin.userId });
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: "set_admin_role",
      targetType: "user",
      targetId: data.targetUserId,
      payload: { role: data.role },
    });
  });

export const removeAdminRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), targetUserId: z.string() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    const { error } = await supabaseAdmin
      .from("admin_roles")
      .delete()
      .eq("user_id", data.targetUserId);
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: "remove_admin_role",
      targetType: "user",
      targetId: data.targetUserId,
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Moderation — reports
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminReports = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(20),
      status: z.enum(["pending", "reviewed", "dismissed", "all"]).default("pending"),
    }),
  )
  .handler(async ({ data }): Promise<{ reports: AdminReportRow[]; total: number }> => {
    await requireAdminUser(data.token);

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;

    let query = supabaseAdmin
      .from("reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: reports, count, error } = await query;
    if (error) throw error;

    // Enrich with reporter profile
    const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
    const reportedIds = [...new Set((reports ?? []).map((r) => r.reported_person_id))];
    const { data: reporterProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", reporterIds.length > 0 ? reporterIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map(
      (reporterProfiles ?? []).map((p) => [p.id, p]),
    );

    // Fetch emails for all involved users (reporters + reported persons)
    const allIds = [...new Set([...reporterIds, ...reportedIds])];
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map(
      (authData?.users ?? [])
        .filter((u) => allIds.includes(u.id))
        .map((u) => [u.id, u.email ?? null]),
    );

    const rows: AdminReportRow[] = (reports ?? []).map((r) => {
      const rp = profileMap.get(r.reporter_id);
      return {
        id: r.id,
        reporter_id: r.reporter_id,
        reporter_name: rp?.display_name ?? null,
        reporter_email: emailMap.get(r.reporter_id) ?? null,
        reporter_avatar: rp?.avatar_url ?? null,
        reported_person_id: r.reported_person_id,
        reported_person_name: r.reported_person_name,
        reported_person_email: emailMap.get(r.reported_person_id) ?? null,
        category: (r as { category?: string | null }).category ?? null,
        reason: r.reason,
        also_blocked: r.also_blocked,
        status: r.status as "pending" | "reviewed" | "dismissed",
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return { reports: rows, total: count ?? 0 };
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      reportId: z.string(),
      status: z.enum(["reviewed", "dismissed"]),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status })
      .eq("id", data.reportId);
    if (error) throw error;

    await logAdminAction({
      adminId: admin.userId,
      action: `report_${data.status}`,
      targetType: "report",
      targetId: data.reportId,
    });
  });

export const banUserFromReport = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      reportId: z.string(),
      userId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");

    await Promise.all([
      supabaseAdmin.from("profiles").update({ is_live: false }).eq("id", data.userId),
      supabaseAdmin.from("reports").update({ status: "reviewed" }).eq("id", data.reportId),
    ]);

    await logAdminAction({
      adminId: admin.userId,
      action: "ban_user_from_report",
      targetType: "user",
      targetId: data.userId,
      payload: { reportId: data.reportId },
    });
  });

export const getAdminBlocksOnly = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ data }): Promise<{ blocks: AdminBlockRow[]; total: number }> => {
    await requireAdminUser(data.token);

    // Fetch all blocks and reports to find blocks with no matching report.
    const [{ data: allBlocks }, { data: allReports }] = await Promise.all([
      supabaseAdmin
        .from("blocks")
        .select("blocker_id, blocked_id, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("reports").select("reporter_id, reported_person_id"),
    ]);

    // Build a set of reporter→reported pairs that already have a report.
    const reportedPairs = new Set(
      (allReports ?? []).map((r) => `${r.reporter_id}-${r.reported_person_id}`),
    );

    // Keep only blocks that have no corresponding report.
    const blockOnly = (allBlocks ?? []).filter(
      (b) => !reportedPairs.has(`${b.blocker_id}-${b.blocked_id}`),
    );

    const total = blockOnly.length;
    const from = (data.page - 1) * data.perPage;
    const paged = blockOnly.slice(from, from + data.perPage);

    if (paged.length === 0) return { blocks: [], total };

    // Resolve emails for all involved users.
    const userIds = [...new Set(paged.flatMap((b) => [b.blocker_id, b.blocked_id]))];
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map(
      (authData?.users ?? [])
        .filter((u) => userIds.includes(u.id))
        .map((u) => [u.id, u.email ?? null]),
    );

    const blocks: AdminBlockRow[] = paged.map((b) => ({
      blocker_id: b.blocker_id,
      blocker_email: emailMap.get(b.blocker_id) ?? null,
      blocked_id: b.blocked_id,
      blocked_email: emailMap.get(b.blocked_id) ?? null,
      created_at: b.created_at,
    }));

    return { blocks, total };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Admin team management
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminAdmins = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminAdminRow[]> => {
    await requireAdminUser(data.token);

    const { data: roles, error } = await supabaseAdmin
      .from("admin_roles")
      .select("user_id, role, created_at, created_by")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: authData, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersErr) throw usersErr;

    const userIds = (roles ?? []).map((r) => r.user_id);
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    if (profilesErr) throw profilesErr;

    const usersMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u]));
    const profilesMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    return (roles ?? []).map((r) => ({
      user_id: r.user_id,
      email: usersMap[r.user_id]?.email ?? null,
      display_name: profilesMap[r.user_id]?.display_name ?? null,
      avatar_url: profilesMap[r.user_id]?.avatar_url ?? null,
      role: r.role as AdminRoleValue,
      created_at: r.created_at,
      created_by: r.created_by ?? null,
    }));
  });

export const createAdminAccount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      email: z.string().email(),
      password: z.string().min(8),
      display_name: z.string().min(1).max(40),
      role: z.enum(["ADMIN", "SUPER_ADMIN"]),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    if (admin.role !== "SUPER_ADMIN") throw new Error("Forbidden");

    const { data: newUser, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { display_name: data.display_name },
      });
    if (createErr) throw createErr;

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUser.user.id, display_name: data.display_name, onboarding_completed: true });
    if (profileErr) throw profileErr;

    const { error: roleErr } = await supabaseAdmin
      .from("admin_roles")
      .upsert({ user_id: newUser.user.id, role: data.role, created_by: admin.userId });
    if (roleErr) throw roleErr;

    await logAdminAction({
      adminId: admin.userId,
      action: "create_admin",
      targetType: "user",
      targetId: newUser.user.id,
      payload: { role: data.role, email: data.email },
    });
  });

export const getAdminDeletedUsers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(25),
    }),
  )
  .handler(async ({ data }): Promise<{ users: AdminDeletedUserRow[]; total: number }> => {
    await requireAdminUser(data.token);

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;

    const { data: rows, count, error } = await supabaseAdmin
      .from("deleted_emails")
      .select("email, deleted_at", { count: "exact" })
      .order("deleted_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      users: (rows ?? []).map((r) => ({
        email: r.email,
        deleted_at: r.deleted_at,
      })),
      total: count ?? 0,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminSubscriptions = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(25),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      subscriptions: AdminSubscriptionRow[];
      total: number;
      summary: { weekly: number; monthly: number; yearly: number; totalMrr: number };
    }> => {
      await requireAdminUser(data.token);

      const from = (data.page - 1) * data.perPage;
      const to = from + data.perPage - 1;

      // Fetch subscription data — these columns are not in generated types, use cast
      const { data: profiles, count, error } = await (supabaseAdmin as ReturnType<
        typeof import("@supabase/supabase-js").createClient
      >)
        .from("profiles")
        .select(
          "id, display_name, avatar_url, plan_tier, subscription_status, subscription_period_end, stripe_customer_id, stripe_subscription_id",
          { count: "exact" },
        )
        .not("subscription_status", "is", null)
        .order("subscription_period_end", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Enrich with emails
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const emailMap = new Map(
        (authData?.users ?? []).map((u) => [u.id, u.email ?? null]),
      );

      const subscriptions: AdminSubscriptionRow[] = (profiles ?? []).map(
        (p: Record<string, unknown>) => ({
          user_id: p.id as string,
          email: emailMap.get(p.id as string) ?? null,
          display_name: (p.display_name as string | null) ?? null,
          avatar_url: (p.avatar_url as string | null) ?? null,
          plan_tier: (p.plan_tier as string | null) ?? null,
          subscription_status: (p.subscription_status as string | null) ?? null,
          subscription_period_end: (p.subscription_period_end as string | null) ?? null,
          stripe_customer_id: (p.stripe_customer_id as string | null) ?? null,
          stripe_subscription_id: (p.stripe_subscription_id as string | null) ?? null,
        }),
      );

      // Summary counts (active only)
      const active = subscriptions.filter((s) => s.subscription_status === "active");
      const weekly = active.filter((s) => s.plan_tier === "weekly").length;
      const monthly = active.filter((s) => s.plan_tier === "monthly").length;
      const yearly = active.filter((s) => s.plan_tier === "yearly").length;
      const totalMrr = Math.round(
        (weekly * 8.67 + monthly * 6 + yearly * 4.17) * 100,
      ) / 100;

      return { subscriptions, total: count ?? 0, summary: { weekly, monthly, yearly, totalMrr } };
    },
  );

// ─────────────────────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminAuditLog = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(25),
      adminId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminUser(data.token);

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;

    let query = supabaseAdmin
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.adminId) {
      query = query.eq("admin_id", data.adminId);
    }

    const { data: entries, count, error } = await query;
    if (error) throw error;

    return { entries: entries ?? [], total: count ?? 0 };
  });

// ─────────────────────────────────────────────────────────────────────────────
// App configuration (knobs that were previously hardcoded in the user app)
// ─────────────────────────────────────────────────────────────────────────────

const APP_CONFIG_KEYS = [
  "default_radius_m",
  "radius_options_m",
  "free_session_minutes",
  "paid_session_options_minutes",
  "free_daily_session_cap",
  // Global Spot rules — JSON array of { order, title, body }. Shown to
  // users in a modal every time they tap Join Spot (no per-user accept
  // tracking; the modal is shown unconditionally).
  "spot_rules",
] as const;
type AppConfigKey = (typeof APP_CONFIG_KEYS)[number];

/** Read all app_config rows. No auth — values are public per RLS. */
export const getAppConfig = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminUser(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("app_config")
      .select("key, value, updated_at");
    if (error) throw error;
    return rows ?? [];
  });

/** Admin-only single-key update. */
export const updateAppConfig = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      key: z.enum(APP_CONFIG_KEYS),
      // jsonb value — we accept anything Zod-serializable
      value: z.any(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin
      .from("app_config")
      .update({ value: data.value })
      .eq("key", data.key);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "app_config.update",
      targetType: "app_config",
      targetId: data.key,
      payload: { value: data.value },
    });
    return { ok: true };
  });

export type AppConfigRow = { key: AppConfigKey; value: unknown; updated_at: string };
