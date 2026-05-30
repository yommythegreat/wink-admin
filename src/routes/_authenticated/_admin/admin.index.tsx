import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  CreditCard,
  Activity,
  ShieldAlert,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { getAdminDashboardStats } from "@/server-fns/admin";
import { getAdminReports } from "@/server-fns/admin";
import { AdminBadge } from "@/components/admin/AdminBadge";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminQuery(
    ["admin-dashboard"],
    (token) => getAdminDashboardStats({ data: { token } }),
  );

  const { data: reportsData } = useAdminQuery(
    ["admin-reports-preview"],
    (token) => getAdminReports({ data: { token, page: 1, perPage: 5, status: "pending" } }),
  );

  const totalMrr = stats?.revenueByTier.reduce((sum, t) => sum + t.mrr, 0) ?? 0;

  return (
    <div className="flex flex-col">
      <AdminHeader crumbs={[{ label: "Dashboard" }]} />

      <div className="space-y-6 p-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AdminStatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            loading={isLoading}
          />
          <AdminStatCard
            title="Paid Users"
            value={stats?.paidUsers ?? 0}
            icon={CreditCard}
            loading={isLoading}
          />
          <AdminStatCard
            title="Active Today"
            value={stats?.activeToday ?? 0}
            icon={Activity}
            loading={isLoading}
          />
          <AdminStatCard
            title="Total Winks"
            value={stats?.totalWinks ?? 0}
            icon={Zap}
            loading={isLoading}
          />
          <AdminStatCard
            title="Pending Reports"
            value={stats?.pendingReports ?? 0}
            icon={ShieldAlert}
            loading={isLoading}
            description={
              (stats?.pendingReports ?? 0) > 0 ? "Needs review" : undefined
            }
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Signups — last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats?.signupsByDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    interval={6}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    labelFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="oklch(0.66 0.22 12)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Subscribers by plan — est. MRR ${totalMrr.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.revenueByTier ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="tier"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) =>
                      v.charAt(0).toUpperCase() + v.slice(1)
                    }
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="oklch(0.66 0.22 12)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pending reports preview */}
        {(reportsData?.reports.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Pending Reports</CardTitle>
              <Link
                to="/admin/moderation"
                className="text-xs text-wink hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportsData?.reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {r.reporter_name ?? "Unknown"} reported{" "}
                        <span className="text-muted-foreground">
                          {r.reported_person_name ?? r.reported_person_id}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                    <AdminBadge status={r.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
