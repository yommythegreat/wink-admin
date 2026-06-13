import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Search } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { getAdminUsers, getAdminDeletedUsers, banUser, deleteUser } from "@/server-fns/admin";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminUserRow } from "@/integrations/supabase/admin-types";

export const Route = createFileRoute("/_authenticated/_admin/admin/users/")({
  component: AdminUsersPage,
});

type Filter = "all" | "paid" | "free" | "live";

function AdminUsersPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Active users state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);

  // Deleted users state
  const [deletedPage, setDeletedPage] = useState(1);

  const { data, isLoading } = useAdminQuery(
    ["admin-users", page, search, filter],
    (token) =>
      getAdminUsers({ data: { token, page, perPage: 25, search: search || undefined, filter } }),
    { keepPreviousData: true } as never,
  );

  const { data: deletedData, isLoading: deletedLoading } = useAdminQuery(
    ["admin-deleted-users", deletedPage],
    (token) => getAdminDeletedUsers({ data: { token, page: deletedPage, perPage: 25 } }),
    { keepPreviousData: true } as never,
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));
  const deletedTotalPages = Math.max(1, Math.ceil((deletedData?.total ?? 0) / 25));

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Users" }]}
        right={<RecordCount count={data?.total} label="users" />}
      />

      <div className="space-y-4 p-6">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deleted">
              Deleted{(deletedData?.total ?? 0) > 0 && ` (${deletedData?.total})`}
            </TabsTrigger>
          </TabsList>

          {/* ── Active users ── */}
          <TabsContent value="active" className="mt-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1" style={{ minWidth: "200px", maxWidth: "360px" }}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={(v) => { setFilter(v as Filter); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="paid">Paid only</SelectItem>
                  <SelectItem value="free">Free only</SelectItem>
                  <SelectItem value="live">Live now</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Reports</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 animate-pulse rounded-full bg-surface" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : (data?.users ?? []).map((u, idx) => (
                        <TableRow
                          key={u.id}
                          className="group cursor-pointer"
                          onClick={() => navigate({ to: "/admin/users/$id", params: { id: u.id } })}
                        >
                          <TableCell className="text-muted-foreground">{(page - 1) * 25 + idx + 1}</TableCell>
                          <TableCell>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {(u.display_name ?? u.email ?? "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            {u.display_name ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email ?? "—"}
                          </TableCell>
                          <TableCell>
                            {u.plan_tier ? (
                              <AdminBadge status="paid" />
                            ) : (
                              <AdminBadge status="free" />
                            )}
                          </TableCell>
                          <TableCell>
                            <AdminBadge status={u.is_live ? "live" : "offline"} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {u.report_count > 0 ? (
                              <span className="text-sm font-medium text-destructive">
                                {u.report_count}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                <DropdownMenuItem asChild>
                                  <Link to="/admin/users/$id" params={{ id: u.id }}>
                                    View details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setBanTarget(u)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Ban user
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(u)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Delete account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Deleted users ── */}
          <TabsContent value="deleted" className="mt-4 space-y-4">
            <div className="flex items-center justify-end">
              <RecordCount count={deletedData?.total} label="deleted accounts" />
            </div>

            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Deleted on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 3 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 animate-pulse rounded-full bg-surface" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : (deletedData?.users ?? []).length === 0
                      ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                              No deleted accounts yet.
                            </TableCell>
                          </TableRow>
                        )
                      : (deletedData?.users ?? []).map((u, idx) => (
                          <TableRow key={u.email}>
                            <TableCell className="text-muted-foreground">{(deletedPage - 1) * 25 + idx + 1}</TableCell>
                            <TableCell className="text-sm">{u.email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(u.deleted_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {deletedTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {deletedPage} of {deletedTotalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletedPage((p) => Math.max(1, p - 1))}
                    disabled={deletedPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletedPage((p) => Math.min(deletedTotalPages, p + 1))}
                    disabled={deletedPage === deletedTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Ban confirm */}
      <AdminConfirmAction
        open={!!banTarget}
        onOpenChange={(o) => { if (!o) setBanTarget(null); }}
        title={`Ban ${banTarget?.display_name ?? "this user"}?`}
        description="This will take the user offline immediately. They can still log in but won't be discoverable."
        confirmLabel="Ban user"
        destructive
        onConfirm={async () => {
          if (!banTarget || !session?.access_token) return;
          await banUser({
            data: { token: session.access_token, userId: banTarget.id, reason: "Admin action" },
          });
          toast.success("User banned");
          invalidate();
          setBanTarget(null);
        }}
      />

      {/* Delete confirm */}
      <AdminConfirmAction
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.display_name ?? "this account"} permanently?`}
        description="This permanently deletes the auth user and all their data. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          if (!deleteTarget || !session?.access_token) return;
          await deleteUser({
            data: { token: session.access_token, userId: deleteTarget.id },
          });
          toast.success("Account deleted");
          invalidate();
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
