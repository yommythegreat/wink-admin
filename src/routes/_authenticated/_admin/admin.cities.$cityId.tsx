import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Tags } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getCities,
  getSpots,
  getSpotCategories,
  getCityCategoryIds,
  setCityCategories,
} from "@/server-fns/spots";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { errMessage } from "@/lib/err-message";

export const Route = createFileRoute("/_authenticated/_admin/admin/cities/$cityId")({
  component: AdminCityDetailPage,
});

function AdminCityDetailPage() {
  const { cityId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  // Re-use the existing list endpoints + filter client-side. Volume is small
  // enough that adding a dedicated getCity / getCategory endpoint isn't worth
  // the round-trip-savings.
  const { data: cities } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );
  const { data: categories } = useAdminQuery(
    ["admin-spot-categories"],
    (t) => getSpotCategories({ data: { token: t } }),
  );
  const { data: enabledCategoryIds } = useAdminQuery(
    ["admin-city-categories", cityId],
    (t) => getCityCategoryIds({ data: { token: t, city_id: cityId } }),
  );
  const { data: spots } = useAdminQuery(
    ["admin-spots", cityId, "", true],
    (t) => getSpots({ data: { token: t, city_id: cityId, include_archived: true } }),
  );

  const city = cities?.find((c) => c.id === cityId);
  const enabledIds = new Set(enabledCategoryIds ?? []);
  const enabledCategoryRows = (categories ?? []).filter((c) => enabledIds.has(c.id));

  const [manageOpen, setManageOpen] = useState(false);

  if (!city) {
    return (
      <div className="flex flex-col">
        <AdminHeader crumbs={[{ label: "Cities", to: "/admin/cities" }, { label: "…" }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading city…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Cities", to: "/admin/cities" }, { label: city.name }]}
        right={
          <button
            onClick={() => navigate({ to: "/admin/cities" })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        }
      />

      <div className="space-y-6 p-6">
        {/* City summary card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">{city.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                /{city.slug} · {city.country ?? "—"}
              </p>
            </div>
            <AdminBadge status={city.is_active ? "active" : "offline"} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <SummaryItem label="Latitude" value={city.center_lat.toFixed(4)} />
            <SummaryItem label="Longitude" value={city.center_lng.toFixed(4)} />
            <SummaryItem label="Radius" value={`${(city.radius_m / 1000).toFixed(1)} km`} />
            <SummaryItem label="Created" value={new Date(city.created_at).toLocaleDateString()} />
          </dl>
        </div>

        {/* Categories assigned to this city */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-medium">
                <Tags className="h-4 w-4 text-muted-foreground" /> Categories enabled here
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick which global categories appear in this city. Users only
                see categories enabled here.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              Manage categories
            </Button>
          </div>
          {enabledCategoryRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No categories enabled yet — click <strong>Manage categories</strong> to pick some.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {enabledCategoryRows.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/admin/categories/$categoryId"
                    params={{ categoryId: c.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground transition-colors hover:bg-secondary/70"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Spots in this city */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-muted-foreground" /> Spots in {city.name}
              <span className="text-xs text-muted-foreground">({spots?.length ?? 0})</span>
            </h3>
            <Link
              to="/admin/spots"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Add spot →
            </Link>
          </div>
          {!spots || spots.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No spots in this city yet. Go to <Link to="/admin/spots" className="underline">Spots</Link> to add some.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {spots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.category_name ?? "—"} · {s.member_count} member{s.member_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <AdminBadge status={s.is_active ? "active" : "offline"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ManageCategoriesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        token={token}
        cityId={city.id}
        cityName={city.name}
        allCategories={categories ?? []}
        currentlyEnabled={enabledCategoryIds ?? []}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-city-categories", cityId] });
        }}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

// Reused: same checkbox-grid logic that used to live on admin.categories.tsx
// CityCategoryPanel. Lifted here because admin.categories.tsx no longer
// surfaces per-city assignment — it lives on the city detail page now.
function ManageCategoriesDialog({
  open,
  onOpenChange,
  token,
  cityId,
  cityName,
  allCategories,
  currentlyEnabled,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  cityId: string;
  cityName: string;
  allCategories: { id: string; name: string; is_active: boolean }[];
  currentlyEnabled: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set(currentlyEnabled));
  }, [open, currentlyEnabled]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await setCityCategories({
        data: { token, city_id: cityId, category_ids: [...selected] },
      });
      toast.success(`${cityName} categories saved`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error("Couldn't save: " + errMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage categories for {cityName}</DialogTitle>
          <DialogDescription>
            Tick the categories you want users to see when they open the Spots
            tab while in {cityName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {allCategories.filter((c) => c.is_active).map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4"
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
