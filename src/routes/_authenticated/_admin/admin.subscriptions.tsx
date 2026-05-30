import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { getAdminSubscriptions } from "@/server-fns/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminQuery(
    ["admin-subscriptions", page],
    (token) => getAdminSubscriptions({ data: { token, page, perPage: 25 } }),
    { keepPreviousData: true } as never,
  );

  const summary = data?.summary;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  const chartData = summary
    ? [
        { tier: "Weekly", count: summary.weekly },
        { tier: "Monthly", count: summary.monthly },
        { tier: "Yearly", count: summary.yearly },
      ]
    : [];

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Subscriptions" }]}
      />

      <div className="space-y-6 p-6">
        {/* KPI tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            title="Weekly subscribers"
            value={summary?.weekly ?? 0}
            icon={CreditCard}
            loading={isLoading}
          />
          <AdminStatCard
            title="Monthly subscribers"
            value={summary?.monthly ?? 0}
            icon={CreditCard}
            loading={isLoading}
          />
          <AdminStatCard
            title="Yearly subscribers"
            value={summary?.yearly ?? 0}
            icon={CreditCard}
            loading={isLoading}
          />
          <AdminStatCard
            title="Est. MRR"
            value={summary ? `$${summary.totalMrr.toFixed(2)}` : "$0.00"}
            icon={TrendingUp}
            loading={isLoading}
            description="Weekly×$8.67 + Monthly×$6 + Yearly×$4.17"
          />
        </div>

        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscribers by plan tier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.66 0.22 12)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscriptions table */}
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead>Stripe ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (data?.subscriptions ?? []).map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(s.display_name ?? s.email ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.display_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Link
                          to="/admin/users/$id"
                          params={{ id: s.user_id }}
                          className="underline-offset-2 hover:underline"
                        >
                          {s.email ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {s.plan_tier ? (
                          <span className="text-sm capitalize">{s.plan_tier}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.subscription_status ? (
                          <AdminBadge status={s.subscription_status} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.subscription_period_end
                          ? new Date(s.subscription_period_end).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs text-muted-foreground">
                        {s.stripe_customer_id ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

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
    </div>
  );
}
