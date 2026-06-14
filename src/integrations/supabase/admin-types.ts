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

// ─────────────────────────────────────────────────────────────────────────────
// Wink Spots — admin-side row shapes.
// All rows here describe data returned by /admin/spots/* server functions.
// Mirrors the column lists in supabase/migrations/20260609000001_cities.sql
// through 20260609000010_spot_suggestion_notify.sql.
// ─────────────────────────────────────────────────────────────────────────────

export type AdminCityRow = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Optional aggregate fields filled in by getCities for the dashboard list.
  spot_count?: number;
  member_count?: number;
};

export type AdminSpotCategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminSpotRow = {
  id: string;
  city_id: string;
  city_name: string | null;
  category_id: string;
  category_name: string | null;
  category_icon: string | null;
  name: string;
  description: string | null;
  address: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
};

export type AdminSpotSuggestionRow = {
  id: string;
  submitted_by: string;
  submitter_name: string | null;
  submitter_email: string | null;
  name: string;
  category_id: string | null;
  category_text: string | null;
  city_id: string | null;
  city_text: string | null;
  address: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "converted";
  reviewed_by: string | null;
  reviewed_at: string | null;
  converted_spot_id: string | null;
  created_at: string;
};

export type AdminLaunchInterestRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  lat: number;
  lng: number;
  notified_at: string | null;
  created_at: string;
};

export type AdminSpotAnalyticsRow = {
  spot_id: string;
  spot_name: string;
  total_members: number;
  available_to_connect: number;
  total_winks_sent: number;
  total_winks_received: number;
  total_matches: number;
};

export type AdminCityAnalyticsRow = {
  city_id: string;
  city_name: string;
  total_spots: number;
  total_members: number;
  total_matches: number;
  // Users with 2+ active memberships in the city — a rough "repeat visit" proxy.
  repeat_members: number;
};
