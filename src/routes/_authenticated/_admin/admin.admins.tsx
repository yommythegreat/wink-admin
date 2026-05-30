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
import { getAdminAdmins, createAdminAccount, removeAdminRole } from "@/server-fns/admin";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminAdminRow, AdminRoleValue } from "@/integrations/supabase/admin-types";

export const Route = createFileRoute("/_authenticated/_admin/admin/admins")({
  component: AdminTeamPage,
});

const createSchema = z.object({
  display_name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});
type CreateForm = z.infer<typeof createSchema>;

function AdminTeamPage() {
  const { session } = useAuth();
  const { role: adminRole } = useAdminRole();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminAdminRow | null>(null);

  const { data: admins, isLoading } = useAdminQuery(
    ["admin-admins"],
    (token) => getAdminAdmins({ data: { token } }),
  );

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { display_name: "", email: "", password: "", role: "ADMIN" },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-admins"] });
  }

  async function handleCreate(values: CreateForm) {
    if (!session?.access_token) return;
    await createAdminAccount({
      data: {
        token: session.access_token,
        email: values.email,
        password: values.password,
        display_name: values.display_name,
        role: values.role,
      },
    });
    toast.success("Admin account created");
    form.reset();
    setShowCreate(false);
    invalidate();
  }

  if (adminRole !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col">
        <AdminHeader
          crumbs={[
            { label: "Admin", to: "/admin" },
            { label: "Admin Team" },
          ]}
        />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            This page is only accessible to Super Admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Admin Team" },
        ]}
        right={
          <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "Add Admin"}
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {/* Create form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Create admin account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Display name</Label>
                    <Input {...form.register("display_name")} className="mt-1" />
                    {form.formState.errors.display_name && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.display_name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...form.register("email")} className="mt-1" />
                    {form.formState.errors.email && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Temporary password</Label>
                    <Input type="password" {...form.register("password")} className="mt-1" />
                    {form.formState.errors.password && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={form.watch("role")}
                      onValueChange={(v) =>
                        form.setValue("role", v as "ADMIN" | "SUPER_ADMIN")
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating…" : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Admins table */}
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (admins ?? []).map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(a.display_name ?? a.email ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {a.display_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <AdminBadge status={a.role.toLowerCase() as never} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => setRemoveTarget(a)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AdminConfirmAction
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title={`Remove admin access for ${removeTarget?.display_name ?? removeTarget?.email ?? "this user"}?`}
        description="This revokes their admin role. Their account remains active but they will no longer have access to the admin panel."
        confirmLabel="Remove access"
        destructive
        onConfirm={async () => {
          if (!removeTarget || !session?.access_token) return;
          await removeAdminRole({
            data: { token: session.access_token, targetUserId: removeTarget.user_id },
          });
          toast.success("Admin access removed");
          invalidate();
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
