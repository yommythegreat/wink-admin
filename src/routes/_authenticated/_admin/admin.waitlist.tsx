import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { getAdminWaitlistSignups } from "@/server-fns/admin";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Public marketing site (usewink.app + wink-waitlist) waitlist signups.
// View-only for v1 — email + source + timestamp. Server-side email
// search + pagination since reads bypass RLS via service role and the
// list can grow large.
export const Route = createFileRoute("/_authenticated/_admin/admin/waitlist")({
  component: AdminWaitlistPage,
});

const PER_PAGE = 25;

function AdminWaitlistPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset back to page 1 whenever the search changes so we don't
  // accidentally page past the (smaller) filtered result set.
  function onSearchChange(next: string) {
    setSearch(next);
    setPage(1);
  }

  const { data, isLoading } = useAdminQuery(
    ["admin-waitlist", search, page],
    (t) =>
      getAdminWaitlistSignups({
        data: { token: t, page, perPage: PER_PAGE, search },
      }),
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Waitlist" }]}
        right={<RecordCount count={total} label="signups" />}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Every email captured on the public marketing site (usewink.app
          waitlist form + wink-waitlist sister site). Public inserts,
          service-role reads only — this is the sole surface for reviewing
          the list.
        </p>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search email…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Signed up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded-full bg-surface" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? `No signups match "${search}".`
                      : "No waitlist signups yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {(page - 1) * PER_PAGE + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.source ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {total > PER_PAGE ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {lastPage}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
