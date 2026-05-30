// Server-only. Import exclusively in server functions (src/server-fns/) or src/server.ts.
// Never import this in client-side code (hooks, components, routes).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AdminRoleValue } from "@/integrations/supabase/admin-types";

export type { AdminRoleValue };

export type AdminUser = {
  userId: string;
  email: string | undefined;
  role: AdminRoleValue;
};

/**
 * Validates a Supabase JWT and confirms the caller has an admin role.
 * Throws "Unauthorized" if the token is invalid.
 * Throws "Forbidden" if the user exists but has no admin role.
 * Returns the admin user record on success.
 */
export async function requireAdminUser(token: string): Promise<AdminUser> {
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
    role: row.role as AdminRoleValue,
  };
}

/**
 * Writes an entry to admin_audit_log.
 * Fire-and-forget: audit failures are logged to console but do NOT block the
 * primary admin operation.
 */
export async function logAdminAction(params: {
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
  if (error) console.error("[admin-audit] Failed to write log:", error.message);
}
