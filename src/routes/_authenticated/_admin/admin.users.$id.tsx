import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAdminRole } from "@/hooks/use-admin-role";
import {
  getAdminUserDetail,
  updateAdminUserProfile,
  banUser,
  unbanUser,
  deleteUser,
} from "@/server-fns/admin";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/_admin/admin/users/$id")({
  component: AdminUserDetailPage,
});

const profileSchema = z.object({
  display_name: z.string().min(1).max(40),
  bio: z.string().max(140).nullable(),
  birthdate: z.string().nullable(),
  gender: z.enum(["M", "F", "N", ""]).nullable(),
});
type ProfileForm = z.infer<typeof profileSchema>;

function AdminUserDetailPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const { role } = useAdminRole();
  const qc = useQueryClient();
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [confirmBan, setConfirmBan] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: user, isLoading } = useAdminQuery(
    ["admin-user", id],
    (token) => getAdminUserDetail({ data: { token, userId: id } }),
  );

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      display_name: user?.display_name ?? "",
      bio: user?.bio ?? null,
      birthdate: user?.birthdate ?? null,
      gender: (user?.gender as "M" | "F" | "N" | "") ?? null,
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-user", id] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleSaveProfile(values: ProfileForm) {
    if (!session?.access_token) return;
    await updateAdminUserProfile({
      data: {
        token: session.access_token,
        userId: id,
        display_name: values.display_name,
        bio: values.bio || null,
        birthdate: values.birthdate || null,
        gender: values.gender || null,
      },
    });
    toast.success("Profile updated");
    invalidate();
  }

  if (isLoading || !user) {
    return (
      <div className="flex flex-col">
        <AdminHeader
          crumbs={[
            { label: "Admin", to: "/admin" },
            { label: "Users", to: "/admin/users" },
            { label: "…" },
          ]}
        />
        <div className="p-6">
          <div className="h-48 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Users", to: "/admin/users" },
          { label: user.display_name ?? user.email ?? id },
        ]}
        right={
          isSuperAdmin ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmBan(true)}
              >
                {user.is_banned ? "Unban user" : "Ban user"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete account
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Left: profile card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="text-2xl">
                  {(user.display_name ?? user.email ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-lg font-semibold">
                  {user.display_name ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                <AdminBadge status={user.is_live ? "live" : "offline"} />
                <AdminBadge status={user.is_paid ? "paid" : "free"} />
                {user.subscription_status && (
                  <AdminBadge status={user.subscription_status} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Account info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
              <Row label="Email verified" value={user.email_confirmed_at ? "Yes" : "No"} />
              <Row
                label="Last seen"
                value={
                  user.last_seen_at
                    ? new Date(user.last_seen_at).toLocaleDateString()
                    : "Never"
                }
              />
              <Row label="Plan" value={user.plan_tier ?? "Free"} />
              {user.subscription_period_end && (
                <Row
                  label="Renews"
                  value={new Date(user.subscription_period_end).toLocaleDateString()}
                />
              )}
              <Row label="Onboarded" value={user.onboarding_completed ? "Yes" : "No"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Winks sent" value={user.wink_sent} />
              <Row label="Winks received" value={user.wink_received} />
              <Row label="Live count" value={user.total_live_count ?? 0} />
              <Row label="Times blocked" value={user.block_count} />
              <Row
                label="Reports received"
                value={
                  <span className={user.report_count > 0 ? "font-medium text-destructive" : ""}>
                    {user.report_count}
                  </span>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {user.phone || user.instagram_url || user.x_url || user.tiktok_url ? (
                <>
                  {user.phone && <Row label="Phone" value={user.phone} />}
                  {user.instagram_url && <Row label="Instagram" value={user.instagram_url} />}
                  {user.x_url && <Row label="X / Twitter" value={user.x_url} />}
                  {user.tiktok_url && <Row label="TikTok" value={user.tiktok_url} />}
                </>
              ) : (
                <p className="text-muted-foreground">Contact (Null)</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="reports">
                Reports{user.report_count > 0 && ` (${user.report_count})`}
              </TabsTrigger>
            </TabsList>

            {/* Profile edit form */}
            <TabsContent value="profile">
              <Card>
                <CardContent className="pt-6">
                  <form
                    onSubmit={form.handleSubmit(handleSaveProfile)}
                    className="space-y-4"
                  >
                    <div>
                      <Label>Display name</Label>
                      <Input {...form.register("display_name")} className="mt-1" readOnly={!isSuperAdmin} />
                    </div>
                    <div>
                      <Label>Bio</Label>
                      <Textarea
                        {...form.register("bio")}
                        rows={3}
                        className="mt-1 resize-none"
                        readOnly={!isSuperAdmin}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Birthdate</Label>
                        <Input
                          type="date"
                          {...form.register("birthdate")}
                          className="mt-1"
                          readOnly={!isSuperAdmin}
                        />
                      </div>
                      <div>
                        <Label>Gender</Label>
                        <Select
                          value={form.watch("gender") || "_none_"}
                          onValueChange={(v) =>
                            isSuperAdmin && form.setValue("gender", v === "_none_" ? "" : v as "M" | "F" | "N")
                          }
                          disabled={!isSuperAdmin}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">—</SelectItem>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                            <SelectItem value="N">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Saving…" : "Save changes"}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports tab — links to moderation page with user filter */}
            <TabsContent value="reports">
              <Card>
                <CardContent className="pt-6">
                  {user.report_count === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No reports filed against this user.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This user has {user.report_count} report
                      {user.report_count !== 1 ? "s" : ""}. View them in the{" "}
                      <a href="/admin/moderation" className="text-wink hover:underline">
                        Moderation queue
                      </a>
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirm ban/unban */}
      <AdminConfirmAction
        open={confirmBan}
        onOpenChange={setConfirmBan}
        title={user.is_banned ? "Unban this user?" : "Ban this user?"}
        description={
          user.is_banned
            ? "Restores normal access for this user."
            : "Takes them offline immediately. They can still log in."
        }
        confirmLabel={user.is_banned ? "Unban" : "Ban"}
        destructive={!user.is_banned}
        onConfirm={async () => {
          if (!session?.access_token) return;
          if (!user.is_banned) {
            await banUser({
              data: { token: session.access_token, userId: id, reason: "Admin action" },
            });
            toast.success("User banned");
          } else {
            await unbanUser({ data: { token: session.access_token, userId: id } });
            toast.success("User unbanned");
          }
          invalidate();
        }}
      />

      {/* Confirm delete */}
      <AdminConfirmAction
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete account permanently?"
        description="Deletes the auth user and all their data. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          if (!session?.access_token) return;
          await deleteUser({ data: { token: session.access_token, userId: id } });
          toast.success("Account deleted");
          qc.invalidateQueries({ queryKey: ["admin-users"] });
          window.history.back();
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
