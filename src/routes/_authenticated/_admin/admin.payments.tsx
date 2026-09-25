import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { Button } from "@/components/ui/button";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getPaymentSubmissions,
  approvePaymentSubmission,
  rejectPaymentSubmission,
} from "@/server-fns/admin";
import { errMessage } from "@/lib/err-message";

export const Route = createFileRoute("/_authenticated/_admin/admin/payments")({
  component: AdminPaymentsPage,
});

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function AdminPaymentsPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useAdminQuery(
    ["admin-payments", status],
    (t) => getPaymentSubmissions({ data: { token: t, status } }),
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-payments"] });

  async function approve(id: string, name: string) {
    setBusy(id);
    try {
      const res = await approvePaymentSubmission({ data: { token, id } });
      const credited =
        res && typeof res.referralAwarded === "number" && res.referralAwarded > 0
          ? ` · ₦${res.referralAwarded} credited to referrer`
          : "";
      toast.success(`Approved — ${name}'s plan is active for 1 month${credited}`);
      invalidate();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      await rejectPaymentSubmission({ data: { token, id } });
      toast.success("Marked as rejected");
      invalidate();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Pending Payments" }]}
        right={<RecordCount count={rows.length} label="submissions" />}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Manual bank-transfer payments. Confirm the transfer landed, then <strong>Approve</strong> to
          activate the user's plan for 1 month.
        </p>

        {/* Status filter */}
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                status === s ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No {status === "all" ? "" : status} payment submissions.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.display_name ?? "—"}{" "}
                      <span className="font-normal text-muted-foreground">· {r.email ?? "—"}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="capitalize text-foreground">{r.tier}</span>
                      {r.amount ? ` · ${r.amount}` : ""} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.referral_code && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Referral code: <span className="font-medium text-foreground">{r.referral_code}</span>
                      </p>
                    )}
                  </div>
                  <AdminBadge
                    status={
                      r.status === "approved" ? "active" : r.status === "rejected" ? "offline" : "pending"
                    }
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.receipt_url ? (
                    <a
                      href={r.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      View receipt
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No receipt attached</span>
                  )}
                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approve(r.id, r.display_name ?? "the user")}
                        disabled={busy === r.id}
                      >
                        {busy === r.id ? "Working…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reject(r.id)}
                        disabled={busy === r.id}
                        className="text-destructive hover:text-destructive"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
