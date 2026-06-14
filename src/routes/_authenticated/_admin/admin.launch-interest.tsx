import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { getLaunchInterest } from "@/server-fns/spots";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Admin surface for "users in cities where we haven't launched yet."
// Backed by city_launch_interest — auto-tracked silently each time a user
// opens the Spots tab outside every active city. No reverse-geocode here,
// so we show raw lat/lng + a coarse 1-decimal-place geohash bucket so
// admin can eyeball clusters by area.
export const Route = createFileRoute("/_authenticated/_admin/admin/launch-interest")({
  component: AdminLaunchInterestPage,
});

type Row = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  lat: number;
  lng: number;
  notified_at: string | null;
  created_at: string;
};

function bucketKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function AdminLaunchInterestPage() {
  const { data: rows, isLoading } = useAdminQuery(
    ["admin-launch-interest"],
    (t) => getLaunchInterest({ data: { token: t } }),
  );

  // Group by rough geographic bucket so clusters of demand pop visually.
  // 1 decimal of lat/lng ≈ 11 km — coarse enough to merge same-city
  // signups, fine enough to separate distinct metro areas.
  const buckets = useMemo(() => {
    const map = new Map<string, { key: string; lat: number; lng: number; count: number }>();
    for (const r of rows ?? []) {
      const k = bucketKey(r.lat, r.lng);
      const existing = map.get(k);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(k, { key: k, lat: r.lat, lng: r.lng, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Launch interest" }]}
        right={<RecordCount count={rows?.length} label="signups" />}
      />

      <div className="space-y-6 p-6">
        <p className="text-sm text-muted-foreground">
          Every user who has opened the Spots tab from a location outside
          every active city. Updated silently each time they open the app.
          Use this to decide where Wink should launch next.
        </p>

        <section>
          <h2 className="mb-3 text-sm font-medium">Demand by area</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Buckets group signups by approximate location (~11 km). Highest
            demand first.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S/N</TableHead>
                  <TableHead>Approx. center</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 3 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : buckets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      No launch-interest signups yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  buckets.map((b, idx) => (
                    <TableRow key={b.key}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="tabular-nums">
                        {b.lat.toFixed(2)}, {b.lng.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {b.count}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium">All signups</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S/N</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Latitude</TableHead>
                  <TableHead className="text-right">Longitude</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No launch-interest signups yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (rows as Row[] | undefined ?? []).map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {r.display_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.lat.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.lng.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                            (r.notified_at
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {r.notified_at ? "Notified" : "Open"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
