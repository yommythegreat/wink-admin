import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { useAdminQuery } from "@/hooks/use-admin-query";
import {
  getSpotAnalytics,
  getCityAnalytics,
  getCities,
} from "@/server-fns/spots";

export const Route = createFileRoute(
  "/_authenticated/_admin/admin/spot-analytics",
)({
  component: AdminSpotAnalyticsPage,
});

type Tab = "by-spot" | "by-city";

function AdminSpotAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("by-spot");
  const [cityFilter, setCityFilter] = useState<string>("");

  const { data: cities } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );

  return (
    <div className="flex flex-col">
      <AdminHeader crumbs={[{ label: "Spot analytics" }]} />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Running totals (since v1 launch). Time-series breakdowns are
          deferred — when needed we&apos;ll add a wink_events_daily aggregate.
        </p>

        <div className="flex gap-2">
          <TabButton active={tab === "by-spot"} onClick={() => setTab("by-spot")}>
            Per Spot
          </TabButton>
          <TabButton active={tab === "by-city"} onClick={() => setTab("by-city")}>
            Per City
          </TabButton>
        </div>

        {tab === "by-spot" ? (
          <BySpotTable cityFilter={cityFilter} cities={cities ?? []} onCityFilter={setCityFilter} />
        ) : (
          <ByCityTable />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-sm " +
        (active
          ? "bg-foreground text-background"
          : "bg-secondary text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function BySpotTable({
  cityFilter,
  cities,
  onCityFilter,
}: {
  cityFilter: string;
  cities: { id: string; name: string }[];
  onCityFilter: (v: string) => void;
}) {
  const { data, isLoading } = useAdminQuery(
    ["admin-spot-analytics", cityFilter],
    (t) =>
      getSpotAnalytics({ data: { token: t, city_id: cityFilter || undefined } }),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Filter by city</label>
          <select
            className="ml-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            value={cityFilter}
            onChange={(e) => onCityFilter(e.target.value)}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <RecordCount count={data?.length} label="spots" />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No active Spots yet.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <Th>S/N</Th>
              <Th>Spot</Th>
              <Th>Members</Th>
              <Th>A2C</Th>
              <Th>Winks sent</Th>
              <Th>Winks received</Th>
              <Th>Matches</Th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r, idx) => (
              <tr key={r.spot_id} className="border-t border-border">
                <Td>{idx + 1}</Td>
                <Td>{r.spot_name}</Td>
                <Td>{r.total_members}</Td>
                <Td>{r.available_to_connect}</Td>
                <Td>{r.total_winks_sent}</Td>
                <Td>{r.total_winks_received}</Td>
                <Td>{r.total_matches}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ByCityTable() {
  const { data, isLoading } = useAdminQuery(
    ["admin-city-analytics"],
    (t) => getCityAnalytics({ data: { token: t } }),
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <RecordCount count={data?.length} label="cities" />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No cities defined yet.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <Th>S/N</Th>
              <Th>City</Th>
              <Th>Spots</Th>
              <Th>Members</Th>
              <Th>Repeat members</Th>
              <Th>Matches</Th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r, idx) => (
              <tr key={r.city_id} className="border-t border-border">
                <Td>{idx + 1}</Td>
                <Td>{r.city_name}</Td>
                <Td>{r.total_spots}</Td>
                <Td>{r.total_members}</Td>
                <Td>{r.repeat_members}</Td>
                <Td>{r.total_matches}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
