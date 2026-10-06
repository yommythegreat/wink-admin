import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAdminRole } from "@/hooks/use-admin-role";
import {
  getAdminReports,
  updateReportStatus,
  banUserFromReport,
  getAdminBlocksOnly,
  getAdminChatDeletions,
} from "@/server-fns/admin";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminReportRow,
  AdminBlockRow,
  AdminChatDeletionRow,
} from "@/integrations/supabase/admin-types";

export const Route = createFileRoute("/_authenticated/_admin/admin/moderation")({
  component: AdminModerationPage,
});

type Status = "pending" | "reviewed" | "dismissed" | "blocks" | "deletions";

function AdminModerationPage() {
  const { session } = useAuth();
  const { role } = useAdminRole();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const qc = useQueryClient();

  const [status, setStatus] = useState<Status>("pending");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminReportRow | null>(null);

  const isBlocksTab = status === "blocks";
  const isDeletionsTab = status === "deletions";
  const isReportsTab = !isBlocksTab && !isDeletionsTab;

  const { data, isLoading } = useAdminQuery(
    ["admin-reports", status, page],
    (token) =>
      getAdminReports({
        data: { token, page, perPage: 20, status: status as "pending" | "reviewed" | "dismissed" },
      }),
    { keepPreviousData: true, enabled: isReportsTab } as never,
  );

  const { data: blocksData, isLoading: blocksLoading } = useAdminQuery(
    ["admin-blocks", page],
    (token) => getAdminBlocksOnly({ data: { token, page, perPage: 20 } }),
    { keepPreviousData: true, enabled: isBlocksTab } as never,
  );

  const { data: deletionsData, isLoading: deletionsLoading } = useAdminQuery(
    ["admin-chat-deletions", page],
    (token) => getAdminChatDeletions({ data: { token, page, perPage: 20 } }),
    { keepPreviousData: true, enabled: isDeletionsTab } as never,
  );

  const activeTotal = isBlocksTab
    ? (blocksData?.total ?? 0)
    : isDeletionsTab
      ? (deletionsData?.total ?? 0)
      : (data?.total ?? 0);
  const activeLoading = isBlocksTab
    ? blocksLoading
    : isDeletionsTab
      ? deletionsLoading
      : isLoading;
  const totalPages = Math.max(1, Math.ceil(activeTotal / 20));

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function dismiss(reportId: string) {
    if (!session?.access_token) return;
    await updateReportStatus({
      data: { token: session.access_token, reportId, status: "dismissed" },
    });
    toast.success("Report dismissed");
    invalidate();
  }

  async function markReviewed(reportId: string) {
    if (!session?.access_token) return;
    await updateReportStatus({
      data: { token: session.access_token, reportId, status: "reviewed" },
    });
    toast.success("Marked as reviewed");
    invalidate();
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Moderation" }]}
        right={
          <RecordCount
            count={activeTotal}
            label={
              isBlocksTab
                ? "block-only records"
                : isDeletionsTab
                  ? "chat deletions"
                  : `${status} reports`
            }
          />
        }
      />

      <div className="space-y-4 p-6">
        {/* Status filter */}
        <Tabs value={status} onValueChange={(v) => { setStatus(v as Status); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="deletions">Deletions</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Reports table */}
        {isReportsTab && (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Blocked?</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuperAdmin && status === "pending" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 animate-pulse rounded-full bg-surface" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (data?.reports ?? []).map((r) => (
                      <>
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        >
                          <TableCell>
                            {expanded === r.id ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Link
                              to="/admin/users/$id"
                              params={{ id: r.reporter_id }}
                              className="underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.reporter_email ?? r.reporter_id.slice(0, 8)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            <Link
                              to="/admin/users/$id"
                              params={{ id: r.reported_person_id }}
                              className="underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.reported_person_email ?? r.reported_person_id.slice(0, 8)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.category ? (
                              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {r.category}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                            {r.reason ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.also_blocked ? "Yes" : "No"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <AdminBadge status={r.status} />
                          </TableCell>
                          {isSuperAdmin && status === "pending" && (
                            <TableCell>
                              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => dismiss(r.id)}
                                >
                                  Dismiss
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => markReviewed(r.id)}
                                >
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  onClick={() => setBanTarget(r)}
                                >
                                  Ban
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>

                        {/* Expanded reason */}
                        {expanded === r.id && (
                          <TableRow key={`${r.id}-expanded`}>
                            <TableCell colSpan={8} className="bg-surface/50 pb-4 pt-0">
                              <p className="px-2 text-sm text-foreground">{r.reason}</p>
                              {r.reported_message && (
                                <div className="mx-2 mt-3 rounded-lg border border-border bg-background p-3">
                                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                    Reported {r.reported_message.kind === "text" ? "message" : r.reported_message.kind === "audio" ? "voice note" : r.reported_message.kind === "image" ? "photo" : r.reported_message.kind}
                                  </p>
                                  {r.reported_message.kind === "image" && r.reported_message.media_url ? (
                                    <img src={r.reported_message.media_url} alt="" className="max-h-72 rounded-md" />
                                  ) : r.reported_message.kind === "video" && r.reported_message.media_url ? (
                                    <video src={r.reported_message.media_url} controls className="max-h-72 rounded-md" />
                                  ) : r.reported_message.kind === "audio" && r.reported_message.media_url ? (
                                    <audio src={r.reported_message.media_url} controls />
                                  ) : (
                                    <p className="whitespace-pre-wrap text-sm">{r.reported_message.body}</p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Blocks-only table */}
        {isBlocksTab && (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blocker</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 animate-pulse rounded-full bg-surface" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (blocksData?.blocks ?? []).map((b: AdminBlockRow) => (
                      <TableRow key={`${b.blocker_id}-${b.blocked_id}`}>
                        <TableCell className="text-sm">
                          <Link
                            to="/admin/users/$id"
                            params={{ id: b.blocker_id }}
                            className="underline-offset-2 hover:underline"
                          >
                            {b.blocker_email ?? b.blocker_id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <Link
                            to="/admin/users/$id"
                            params={{ id: b.blocked_id }}
                            className="underline-offset-2 hover:underline"
                          >
                            {b.blocked_email ?? b.blocked_id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* User chat deletions audit table */}
        {isDeletionsTab && (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deleted by</TableHead>
                  <TableHead>Other party</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Deleted at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 animate-pulse rounded-full bg-surface" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (deletionsData?.deletions ?? []).map((d: AdminChatDeletionRow) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">
                          <Link
                            to="/admin/users/$id"
                            params={{ id: d.deleter_id }}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {d.deleter_name ?? d.deleter_email ?? d.deleter_id.slice(0, 8)}
                          </Link>
                          {d.deleter_email && d.deleter_name && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({d.deleter_email})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {d.other_user_id ? (
                            <>
                              <Link
                                to="/admin/users/$id"
                                params={{ id: d.other_user_id }}
                                className="font-medium underline-offset-2 hover:underline"
                              >
                                {d.other_user_name ?? d.other_user_email ?? d.other_user_id.slice(0, 8)}
                              </Link>
                              {d.other_user_email && d.other_user_name && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({d.other_user_email})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {d.chat_id}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(d.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                {!activeLoading && (deletionsData?.deletions ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No user chat deletions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
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
      </div>

      {/* Ban confirm */}
      <AdminConfirmAction
        open={!!banTarget}
        onOpenChange={(o) => { if (!o) setBanTarget(null); }}
        title={`Ban ${banTarget?.reported_person_name ?? "this user"}?`}
        description="Takes the user offline and marks this report as reviewed."
        confirmLabel="Ban + close report"
        destructive
        onConfirm={async () => {
          if (!banTarget || !session?.access_token) return;
          await banUserFromReport({
            data: {
              token: session.access_token,
              reportId: banTarget.id,
              userId: banTarget.reported_person_id,
            },
          });
          toast.success("User banned and report closed");
          invalidate();
          setBanTarget(null);
        }}
      />
    </div>
  );
}
