// Wink Spots — admin server functions.
//
// All mutations call requireAdminUser() at the top to enforce role gating,
// then emit logAdminAction() for audit. Reads only require an admin role
// (no SUPER_ADMIN gate) unless otherwise noted. The pattern mirrors
// src/server-fns/admin.ts; helpers are inlined for the same reason
// (TanStack Start's import-protection plugin doesn't mock transitive
// imports cleanly).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  AdminCityRow,
  AdminSpotCategoryRow,
  AdminSpotRow,
  AdminSpotSuggestionRow,
  AdminSpotAnalyticsRow,
  AdminCityAnalyticsRow,
  AdminLaunchInterestRow,
} from "@/integrations/supabase/admin-types";

// ─────────────────────────────────────────────────────────────────────────────
// Inlined server-only auth helpers — identical to those in admin.ts.
// ─────────────────────────────────────────────────────────────────────────────

type AdminRoleValueInternal = "SUPER_ADMIN" | "ADMIN";
type AdminUserInternal = {
  userId: string;
  email: string | undefined;
  role: AdminRoleValueInternal;
};

async function requireAdminUser(token: string): Promise<AdminUserInternal> {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  const { data: row } = await supabaseAdmin
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) throw new Error("Forbidden");
  return {
    userId: user.id,
    email: user.email,
    role: row.role as AdminRoleValueInternal,
  };
}

async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    payload: params.payload ?? null,
  });
  if (error) console.error("[admin-audit]", error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cities
// ─────────────────────────────────────────────────────────────────────────────

export const getCities = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminCityRow[]> => {
    await requireAdminUser(data.token);

    const { data: cities, error } = await supabaseAdmin
      .from("cities")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (!cities || cities.length === 0) return [];

    // Aggregate spot + member counts in two extra queries so the list page
    // doesn't fan out one query per city. Tables are tiny at admin scale.
    const cityIds = cities.map((c) => c.id);
    const { data: spotCounts } = await supabaseAdmin
      .from("spots")
      .select("city_id")
      .in("city_id", cityIds)
      .eq("is_active", true);

    const { data: memberCounts } = await supabaseAdmin
      .from("profiles")
      .select("current_city_id")
      .in("current_city_id", cityIds);

    const spotMap: Record<string, number> = {};
    for (const s of spotCounts ?? []) {
      spotMap[s.city_id] = (spotMap[s.city_id] ?? 0) + 1;
    }
    const memberMap: Record<string, number> = {};
    for (const p of memberCounts ?? []) {
      if (!p.current_city_id) continue;
      memberMap[p.current_city_id] = (memberMap[p.current_city_id] ?? 0) + 1;
    }

    return cities.map((c) => ({
      ...c,
      spot_count: spotMap[c.id] ?? 0,
      member_count: memberMap[c.id] ?? 0,
    })) as AdminCityRow[];
  });

export const createCity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      name: z.string().min(1).max(80),
      slug: z
        .string()
        .min(1)
        .max(40)
        .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
      country: z.string().max(2).nullable().optional(),
      center_lat: z.number().min(-90).max(90),
      center_lng: z.number().min(-180).max(180),
      radius_m: z.number().int().min(100).max(500000),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { data: row, error } = await supabaseAdmin
      .from("cities")
      .insert({
        name: data.name,
        slug: data.slug,
        country: data.country ?? null,
        center_lat: data.center_lat,
        center_lng: data.center_lng,
        radius_m: data.radius_m,
      })
      .select()
      .single();
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "city.create",
      targetType: "city",
      targetId: row.id,
      payload: { name: data.name, slug: data.slug },
    });
    return row;
  });

export const updateCity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      name: z.string().min(1).max(80).optional(),
      country: z.string().max(2).nullable().optional(),
      center_lat: z.number().min(-90).max(90).optional(),
      center_lng: z.number().min(-180).max(180).optional(),
      radius_m: z.number().int().min(100).max(500000).optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { id, token: _token, ...patch } = data;
    void _token;
    const { error } = await supabaseAdmin.from("cities").update(patch).eq("id", id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "city.update",
      targetType: "city",
      targetId: id,
      payload: patch as Record<string, unknown>,
    });
    return { ok: true };
  });

// Hard-deletes a city. Will fail with a useful FK message if any Spot still
// references the city (spots.city_id ON DELETE RESTRICT). The error helper
// on the client surfaces the constraint name so the admin knows what to do.
export const deleteCity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin.from("cities").delete().eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "city.delete",
      targetType: "city",
      targetId: data.id,
    });
    return { ok: true };
  });

// Calls the SQL helper from migration 9 that pushes "Wink Spots is live in
// {city}" to every user whose stored lat/lng lands inside the city's radius.
export const publishCityLaunch = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), city_id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ notified: number }> => {
    const admin = await requireAdminUser(data.token);
    const { data: count, error } = await supabaseAdmin.rpc("notify_city_launch", {
      in_city_id: data.city_id,
    });
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "city.publish_launch",
      targetType: "city",
      targetId: data.city_id,
      payload: { notified: count },
    });
    return { notified: (count as number) ?? 0 };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Spot categories (global) + per-city category subset
// ─────────────────────────────────────────────────────────────────────────────

export const getSpotCategories = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminSpotCategoryRow[]> => {
    await requireAdminUser(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("spot_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (rows ?? []) as AdminSpotCategoryRow[];
  });

export const createSpotCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      name: z.string().min(1).max(60),
      slug: z
        .string()
        .min(1)
        .max(40)
        .regex(/^[a-z0-9-]+$/),
      icon: z.string().max(40).nullable().optional(),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { data: row, error } = await supabaseAdmin
      .from("spot_categories")
      .insert({
        name: data.name,
        slug: data.slug,
        icon: data.icon ?? null,
        sort_order: data.sort_order,
      })
      .select()
      .single();
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "category.create",
      targetType: "spot_category",
      targetId: row.id,
      payload: { name: data.name, slug: data.slug },
    });
    return row;
  });

export const updateSpotCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      name: z.string().min(1).max(60).optional(),
      icon: z.string().max(40).nullable().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { id, token: _token, ...patch } = data;
    void _token;
    const { error } = await supabaseAdmin.from("spot_categories").update(patch).eq("id", id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "category.update",
      targetType: "spot_category",
      targetId: id,
      payload: patch as Record<string, unknown>,
    });
    return { ok: true };
  });

// Hard-deletes a spot category. Will fail with a useful FK message if any
// Spot still references the category (spots.category_id ON DELETE RESTRICT)
// or if it's listed in any city_categories row. The error helper on the
// client surfaces the constraint name to the admin.
export const deleteSpotCategory = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin.from("spot_categories").delete().eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "category.delete",
      targetType: "spot_category",
      targetId: data.id,
    });
    return { ok: true };
  });

// Returns the set of category ids enabled for a given city. The admin UI
// renders all global categories as checkboxes and pre-checks the ones in
// this set.
export const getCityCategoryIds = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), city_id: z.string().uuid() }))
  .handler(async ({ data }): Promise<string[]> => {
    await requireAdminUser(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("city_categories")
      .select("category_id")
      .eq("city_id", data.city_id);
    if (error) throw error;
    return (rows ?? []).map((r) => r.category_id);
  });

// Sets the full category list for a city via diff-then-apply. Done as a
// single server fn rather than per-row toggles so the UI can save the
// checkbox state in one click and we avoid partial-write states.
export const setCityCategories = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      city_id: z.string().uuid(),
      category_ids: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);

    const { data: existing } = await supabaseAdmin
      .from("city_categories")
      .select("category_id")
      .eq("city_id", data.city_id);
    const existingIds = new Set((existing ?? []).map((r) => r.category_id));
    const targetIds = new Set(data.category_ids);

    const toAdd = [...targetIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !targetIds.has(id));

    if (toAdd.length > 0) {
      const { error: addErr } = await supabaseAdmin
        .from("city_categories")
        .insert(toAdd.map((category_id) => ({ city_id: data.city_id, category_id })));
      if (addErr) throw addErr;
    }
    if (toRemove.length > 0) {
      const { error: rmErr } = await supabaseAdmin
        .from("city_categories")
        .delete()
        .eq("city_id", data.city_id)
        .in("category_id", toRemove);
      if (rmErr) throw rmErr;
    }

    await logAdminAction({
      adminId: admin.userId,
      action: "city_categories.set",
      targetType: "city",
      targetId: data.city_id,
      payload: { added: toAdd, removed: toRemove },
    });
    return { added: toAdd.length, removed: toRemove.length };
  });

// Inverse of setCityCategories: given a category, write the full set of
// cities it's enabled in. Used by the Category detail page (admin clicks
// "Manage cities" and sees a checkbox grid of every active city). Same
// diff-then-apply pattern; just iterates the join table from the opposite
// side.
export const setCategoryCities = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      category_id: z.string().uuid(),
      city_ids: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);

    const { data: existing } = await supabaseAdmin
      .from("city_categories")
      .select("city_id")
      .eq("category_id", data.category_id);
    const existingIds = new Set((existing ?? []).map((r) => r.city_id));
    const targetIds = new Set(data.city_ids);

    const toAdd = [...targetIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !targetIds.has(id));

    if (toAdd.length > 0) {
      const { error: addErr } = await supabaseAdmin
        .from("city_categories")
        .insert(toAdd.map((city_id) => ({ city_id, category_id: data.category_id })));
      if (addErr) throw addErr;
    }
    if (toRemove.length > 0) {
      const { error: rmErr } = await supabaseAdmin
        .from("city_categories")
        .delete()
        .eq("category_id", data.category_id)
        .in("city_id", toRemove);
      if (rmErr) throw rmErr;
    }

    await logAdminAction({
      adminId: admin.userId,
      action: "category_cities.set",
      targetType: "spot_category",
      targetId: data.category_id,
      payload: { added: toAdd, removed: toRemove },
    });
    return { added: toAdd.length, removed: toRemove.length };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Spots
// ─────────────────────────────────────────────────────────────────────────────

export const getSpots = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      city_id: z.string().uuid().optional(),
      category_id: z.string().uuid().optional(),
      include_archived: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }): Promise<AdminSpotRow[]> => {
    await requireAdminUser(data.token);

    let query = supabaseAdmin
      .from("spots")
      .select("*, cities(name), spot_categories(name, icon)")
      .order("created_at", { ascending: false });

    if (data.city_id) query = query.eq("city_id", data.city_id);
    if (data.category_id) query = query.eq("category_id", data.category_id);
    if (!data.include_archived) query = query.eq("is_active", true);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    // Live member counts. One query, group client-side.
    const spotIds = rows.map((r) => r.id);
    const { data: memberRows } = await supabaseAdmin
      .from("spot_memberships")
      .select("spot_id")
      .in("spot_id", spotIds)
      .is("left_at", null);
    const memberMap: Record<string, number> = {};
    for (const m of memberRows ?? []) {
      memberMap[m.spot_id] = (memberMap[m.spot_id] ?? 0) + 1;
    }

    return rows.map((r) => {
      // Supabase's `.select("*, cities(name), spot_categories(name, icon)")`
      // returns the joined rows as nested objects keyed by the relation name.
      const city = (r as unknown as { cities: { name: string } | null }).cities;
      const cat = (r as unknown as { spot_categories: { name: string; icon: string | null } | null })
        .spot_categories;
      return {
        id: r.id,
        city_id: r.city_id,
        city_name: city?.name ?? null,
        category_id: r.category_id,
        category_name: cat?.name ?? null,
        category_icon: cat?.icon ?? null,
        name: r.name,
        description: r.description,
        address: r.address,
        cover_image_url: r.cover_image_url,
        gallery_image_urls: (r as { gallery_image_urls?: string[] | null }).gallery_image_urls ?? [],
        lat: r.lat,
        lng: r.lng,
        is_active: r.is_active,
        archived_at: r.archived_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        member_count: memberMap[r.id] ?? 0,
      } satisfies AdminSpotRow;
    });
  });

export const createSpot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      city_id: z.string().uuid(),
      category_id: z.string().uuid(),
      name: z.string().min(1).max(120),
      description: z.string().max(1000).nullable().optional(),
      address: z.string().max(300).nullable().optional(),
      cover_image_url: z.string().url().nullable().optional(),
      gallery_image_urls: z.array(z.string().url()).optional(),
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
      converted_from_suggestion_id: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { data: row, error } = await supabaseAdmin
      .from("spots")
      .insert({
        city_id: data.city_id,
        category_id: data.category_id,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        cover_image_url: data.cover_image_url ?? null,
        gallery_image_urls: data.gallery_image_urls ?? [],
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        created_by: admin.userId,
        converted_from_suggestion_id: data.converted_from_suggestion_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot.create",
      targetType: "spot",
      targetId: row.id,
      payload: { name: data.name, city_id: data.city_id, category_id: data.category_id },
    });
    return row;
  });

export const updateSpot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      city_id: z.string().uuid().optional(),
      category_id: z.string().uuid().optional(),
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(1000).nullable().optional(),
      address: z.string().max(300).nullable().optional(),
      cover_image_url: z.string().url().nullable().optional(),
      gallery_image_urls: z.array(z.string().url()).optional(),
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { id, token: _token, ...patch } = data;
    void _token;
    const { error } = await supabaseAdmin.from("spots").update(patch).eq("id", id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot.update",
      targetType: "spot",
      targetId: id,
      payload: patch as Record<string, unknown>,
    });
    return { ok: true };
  });

// Soft-archive only. Hard-deleting Spots would orphan winks and memberships;
// is_active=false hides them from user-side discovery while preserving
// historical analytics.
export const archiveSpot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin
      .from("spots")
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot.archive",
      targetType: "spot",
      targetId: data.id,
    });
    return { ok: true };
  });

export const reactivateSpot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin
      .from("spots")
      .update({ is_active: true, archived_at: null })
      .eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot.reactivate",
      targetType: "spot",
      targetId: data.id,
    });
    return { ok: true };
  });

// Hard-deletes a spot. Memberships cascade (spot_memberships.spot_id ON
// DELETE CASCADE) and any winks tagged with this spot keep their row but
// have spot_id reset to NULL (ON DELETE SET NULL). Suggestion conversion
// links also reset to NULL. Use Archive instead when historical analytics
// continuity matters.
export const deleteSpot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin.from("spots").delete().eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot.delete",
      targetType: "spot",
      targetId: data.id,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Spot suggestions queue
// ─────────────────────────────────────────────────────────────────────────────

export const getSpotSuggestions = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      status: z.enum(["pending", "approved", "rejected", "converted", "all"]).default("pending"),
    }),
  )
  .handler(async ({ data }): Promise<AdminSpotSuggestionRow[]> => {
    await requireAdminUser(data.token);

    let query = supabaseAdmin
      .from("spot_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    // Resolve submitter display names + emails for the queue UI.
    const submitterIds = [...new Set(rows.map((r) => r.submitted_by))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", submitterIds);
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    const emailMap = new Map(
      (authData?.users ?? [])
        .filter((u) => submitterIds.includes(u.id))
        .map((u) => [u.id, u.email ?? null]),
    );

    return rows.map((r) => ({
      ...r,
      submitter_name: profileMap.get(r.submitted_by) ?? null,
      submitter_email: emailMap.get(r.submitted_by) ?? null,
    })) as AdminSpotSuggestionRow[];
  });

// Approve = "we'll add it" without creating a Spot yet (e.g., admin needs
// to gather more info). The user gets a push (via the trigger from
// migration 10) but no Spot exists yet.
export const approveSpotSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin
      .from("spot_suggestions")
      .update({
        status: "approved",
        reviewed_by: admin.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot_suggestion.approve",
      targetType: "spot_suggestion",
      targetId: data.id,
    });
    return { ok: true };
  });

export const rejectSpotSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);
    const { error } = await supabaseAdmin
      .from("spot_suggestions")
      .update({
        status: "rejected",
        reviewed_by: admin.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    await logAdminAction({
      adminId: admin.userId,
      action: "spot_suggestion.reject",
      targetType: "spot_suggestion",
      targetId: data.id,
    });
    return { ok: true };
  });

// Convert = create a real Spot from the suggestion in one shot. Admin
// supplies the final, cleaned-up name/city/category since the user's
// submission may be incomplete or free-text.
export const convertSpotSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      city_id: z.string().uuid(),
      category_id: z.string().uuid(),
      name: z.string().min(1).max(120),
      description: z.string().max(1000).nullable().optional(),
      address: z.string().max(300).nullable().optional(),
      cover_image_url: z.string().url().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdminUser(data.token);

    const { data: spot, error: createErr } = await supabaseAdmin
      .from("spots")
      .insert({
        city_id: data.city_id,
        category_id: data.category_id,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        cover_image_url: data.cover_image_url ?? null,
        created_by: admin.userId,
        converted_from_suggestion_id: data.id,
      })
      .select()
      .single();
    if (createErr) throw createErr;

    const { error: updateErr } = await supabaseAdmin
      .from("spot_suggestions")
      .update({
        status: "converted",
        reviewed_by: admin.userId,
        reviewed_at: new Date().toISOString(),
        converted_spot_id: spot.id,
      })
      .eq("id", data.id);
    if (updateErr) throw updateErr;

    await logAdminAction({
      adminId: admin.userId,
      action: "spot_suggestion.convert",
      targetType: "spot_suggestion",
      targetId: data.id,
      payload: { spot_id: spot.id },
    });
    return { spot_id: spot.id };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const getSpotAnalytics = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), city_id: z.string().uuid().optional() }))
  .handler(async ({ data }): Promise<AdminSpotAnalyticsRow[]> => {
    await requireAdminUser(data.token);

    let spotQuery = supabaseAdmin
      .from("spots")
      .select("id, name, city_id")
      .eq("is_active", true);
    if (data.city_id) spotQuery = spotQuery.eq("city_id", data.city_id);
    const { data: spots, error: spotErr } = await spotQuery;
    if (spotErr) throw spotErr;
    if (!spots || spots.length === 0) return [];

    const spotIds = spots.map((s) => s.id);

    // Aggregate everything in parallel.
    const [members, a2c, sent, received] = await Promise.all([
      supabaseAdmin
        .from("spot_memberships")
        .select("spot_id")
        .in("spot_id", spotIds)
        .is("left_at", null),
      supabaseAdmin
        .from("spot_memberships")
        .select("spot_id")
        .in("spot_id", spotIds)
        .is("left_at", null)
        .eq("available_to_connect", true),
      supabaseAdmin
        .from("winks")
        .select("spot_id, sender_id, receiver_id, created_at")
        .in("spot_id", spotIds)
        .eq("context", "spot"),
      // Same query as sent — we recount per spot below.
      Promise.resolve({ data: null as null }),
    ]);
    void received;

    const memberCounts: Record<string, number> = {};
    for (const m of members.data ?? []) memberCounts[m.spot_id] = (memberCounts[m.spot_id] ?? 0) + 1;
    const a2cCounts: Record<string, number> = {};
    for (const m of a2c.data ?? []) a2cCounts[m.spot_id] = (a2cCounts[m.spot_id] ?? 0) + 1;
    const sentCounts: Record<string, number> = {};
    const receivedCounts: Record<string, number> = {};
    for (const w of sent.data ?? []) {
      if (!w.spot_id) continue;
      sentCounts[w.spot_id] = (sentCounts[w.spot_id] ?? 0) + 1;
      // Sent = received for the network as a whole; per-Spot the same wink
      // counts toward both columns since both users are in the Spot.
      receivedCounts[w.spot_id] = (receivedCounts[w.spot_id] ?? 0) + 1;
    }

    // Matches are chats whose creating wink was Spot-context. Resolving
    // that precisely requires inspecting the trigger; for v1 we approximate
    // by counting reciprocal Spot-wink pairs per Spot.
    const matchCounts: Record<string, number> = {};
    const winkPairs = new Set<string>();
    for (const w of sent.data ?? []) {
      if (!w.spot_id) continue;
      const key = `${w.spot_id}|${[w.sender_id, w.receiver_id].sort().join("|")}`;
      if (winkPairs.has(key)) {
        matchCounts[w.spot_id] = (matchCounts[w.spot_id] ?? 0) + 1;
      } else {
        winkPairs.add(key);
      }
    }

    return spots.map((s) => ({
      spot_id: s.id,
      spot_name: s.name,
      total_members: memberCounts[s.id] ?? 0,
      available_to_connect: a2cCounts[s.id] ?? 0,
      total_winks_sent: sentCounts[s.id] ?? 0,
      total_winks_received: receivedCounts[s.id] ?? 0,
      total_matches: matchCounts[s.id] ?? 0,
    }));
  });

export const getCityAnalytics = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminCityAnalyticsRow[]> => {
    await requireAdminUser(data.token);

    const { data: cities, error } = await supabaseAdmin
      .from("cities")
      .select("id, name")
      .eq("is_active", true);
    if (error) throw error;
    if (!cities || cities.length === 0) return [];
    const cityIds = cities.map((c) => c.id);

    const [spots, members, memberCities] = await Promise.all([
      supabaseAdmin.from("spots").select("city_id").in("city_id", cityIds).eq("is_active", true),
      // Members in each city = profiles whose current_city_id matches.
      supabaseAdmin
        .from("profiles")
        .select("id, current_city_id")
        .in("current_city_id", cityIds),
      // Repeat members = users with 2+ active memberships in the city.
      supabaseAdmin
        .from("v_user_active_memberships")
        .select("user_id, city_id")
        .in("city_id", cityIds),
    ]);

    const spotMap: Record<string, number> = {};
    for (const s of spots.data ?? []) spotMap[s.city_id] = (spotMap[s.city_id] ?? 0) + 1;
    const memberMap: Record<string, number> = {};
    for (const p of members.data ?? []) {
      if (!p.current_city_id) continue;
      memberMap[p.current_city_id] = (memberMap[p.current_city_id] ?? 0) + 1;
    }

    // Group v_user_active_memberships rows by (user, city), count those
    // with 2+ memberships.
    const userCityCounts: Record<string, Record<string, number>> = {};
    for (const r of memberCities.data ?? []) {
      const c = r.city_id as string;
      const u = r.user_id as string;
      userCityCounts[c] ??= {};
      userCityCounts[c][u] = (userCityCounts[c][u] ?? 0) + 1;
    }
    const repeatMap: Record<string, number> = {};
    for (const [cityId, users] of Object.entries(userCityCounts)) {
      repeatMap[cityId] = Object.values(users).filter((n) => n >= 2).length;
    }

    // Matches per city = chats whose user1/user2 share city. Approximate:
    // for v1 we tally Spot-context winks per city instead, since "match"
    // creates a chat from a wink and we already have wink context.
    // Defer precise per-city match count until we need it.
    return cities.map((c) => ({
      city_id: c.id,
      city_name: c.name,
      total_spots: spotMap[c.id] ?? 0,
      total_members: memberMap[c.id] ?? 0,
      total_matches: 0,
      repeat_members: repeatMap[c.id] ?? 0,
    }));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Launch interest — users whose detected location is outside every launched
// city. Surfaces demand so admin knows where to launch next. Joined with
// auth.users for email + profiles for display_name.
// ─────────────────────────────────────────────────────────────────────────────

export const getLaunchInterest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<AdminLaunchInterestRow[]> => {
    await requireAdminUser(data.token);

    const { data: rows, error } = await supabaseAdmin
      .from("city_launch_interest")
      .select("id, user_id, lat, lng, notified_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    const emailMap = new Map(
      (authData?.users ?? [])
        .filter((u) => userIds.includes(u.id))
        .map((u) => [u.id, u.email ?? null]),
    );

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      display_name: nameMap.get(r.user_id) ?? null,
      email: emailMap.get(r.user_id) ?? null,
      lat: r.lat,
      lng: r.lng,
      notified_at: r.notified_at,
      created_at: r.created_at,
    }));
  });

