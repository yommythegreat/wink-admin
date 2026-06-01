// Admin-specific TypeScript types.
// Kept separate from types.ts so the auto-generated file can be regenerated without
// losing these definitions.

export type AdminRoleValue = "SUPER_ADMIN" | "ADMIN";

export type AdminRoleRow = {
  user_id: string;
  role: AdminRoleValue;
  created_at: string;
  created_by: string | null;
};

export type AdminAuditLogRow = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

// Enriched user row returned by admin server functions (joins auth.users + profiles)
export type AdminUserRow = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birthdate: string | null;
  gender: string | null;
  is_live: boolean;
  is_banned: boolean;
  is_paid: boolean;
  plan_tier: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  last_seen_at: string | null;
  onboarding_completed: boolean;
  report_count: number;
  admin_role: AdminRoleValue | null;
  // Contact info fields
  phone: string | null;
  instagram_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;
  // Live tracking
  total_live_count: number;
};

// Report row enriched with reporter + reported profile snapshots
export type AdminReportRow = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_avatar: string | null;
  reported_person_id: string;
  reported_person_name: string | null;
  reported_person_email: string | null;
  category: string | null;
  reason: string | null;
  also_blocked: boolean;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  updated_at: string;
};

// Subscription row enriched with profile data
export type AdminSubscriptionRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type AdminDashboardStats = {
  totalUsers: number;
  paidUsers: number;
  activeToday: number;
  pendingReports: number;
  totalWinks: number;
  signupsByDay: { date: string; count: number }[];
  revenueByTier: { tier: string; count: number; mrr: number }[];
};

// Deleted account row returned by getAdminDeletedUsers
export type AdminDeletedUserRow = {
  email: string;
  deleted_at: string;
};

// Block-only row (block with no corresponding report) returned by getAdminBlocksOnly
export type AdminBlockRow = {
  blocker_id: string;
  blocker_email: string | null;
  blocked_id: string;
  blocked_email: string | null;
  created_at: string;
};

// Admin team member row returned by getAdminAdmins
export type AdminAdminRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: AdminRoleValue;
  created_at: string;
  created_by: string | null;
};
