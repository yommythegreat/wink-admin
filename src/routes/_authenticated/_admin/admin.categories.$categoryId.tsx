import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getSpotCategories,
  getCities,
  getSpots,
  setCategoryCities,
} from "@/server-fns/spots";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_authenticated/_admin/admin/categories/$categoryId")({
  component: AdminCategoryDetailPage,
});

function AdminCategoryDetailPage() {
  const { categoryId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data: categories } = useAdminQuery(
    ["admin-spot-categories"],
    (t) => getSpotCategories({ data: { token: t } }),
  );
  const { data: cities } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );

  // Cities currently linked to this category via city_categories. The
  // admin server-fns expose getCityCategoryIds keyed by city, but here we
  // want the inverse — read the join table directly via the admin Supabase
  // client (RLS allows authenticated select on city_categories from migration 2).
  const { data: linkedCityIds } = useQuery({
    queryKey: ["admin-category-cities", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_categories")
        .select("city_id")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data ?? []).map((r) => r.city_id);
    },
  });

  // Spots using this category, across all cities.
  const { data: spotsUsingCategory } = useAdminQuery(
    ["admin-spots", "", categoryId, true],
    (t) => getSpots({ data: { token: t, category_id: categoryId, include_archived: true } }),
  );

  const category = categories?.find((c) => c.id === categoryId);
  const linkedIds = new Set(linkedCityIds ?? []);
  const linkedCities = (cities ?? []).filter((c) => linkedIds.has(c.id));

  const [manageOpen, setManageOpen] = useState(false);

  if (!category) {
    return (
      <div className="flex flex-col">
        <AdminHeader crumbs={[{ label: "Categories", to: "/admin/categories" }, { label: "…" }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading category…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Categories", to: "/admin/categories" }, { label: category.name }]}
        right={
          <button
            onClick={() => navigate({ to: "/admin/categories" })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        }
      />

      <div className="space-y-6 p-6">
        {/* Category summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">{category.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                /{category.slug} · icon: {category.icon ?? "—"} · sort: {category.sort_order}
              </p>
            </div>
            <AdminBadge status={category.is_active ? "active" : "offline"} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Created {new Date(category.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Cities where this category is enabled */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Cities where this is enabled
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Users in these cities see this category in their Spots tab.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              Manage cities
            </Button>
          </div>
          {linkedCities.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Not enabled in any city yet — click <strong>Manage cities</strong> to add some.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {linkedCities.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/admin/cities/$cityId"
                    params={{ cityId: c.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground transition-colors hover:bg-secondary/70"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Spots using this category */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Spots using {category.name}
            <span className="text-xs text-muted-foreground">({spotsUsingCategory?.length ?? 0})</span>
          </h3>
          {!spotsUsingCategory || spotsUsingCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No Spots use this category yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {spotsUsingCategory.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.city_name ?? "—"} · {s.member_count} member{s.member_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <AdminBadge status={s.is_active ? "active" : "offline"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ManageCitiesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        token={token}
        categoryId={category.id}
        categoryName={category.name}
        allCities={cities ?? []}
        currentlyLinked={linkedCityIds ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-category-cities", categoryId] })}
      />
    </div>
  );
}

function ManageCitiesDialog({
  open,
  onOpenChange,
  token,
  categoryId,
  categoryName,
  allCities,
  currentlyLinked,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  categoryId: string;
  categoryName: string;
  allCities: { id: string; name: string; is_active: boolean }[];
  currentlyLinked: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set(currentlyLinked));
  }, [open, currentlyLinked]);

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
      await setCategoryCities({
        data: { token, category_id: categoryId, city_ids: [...selected] },
      });
      toast.success(`${categoryName} cities saved`);
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
          <DialogTitle>Manage cities for {categoryName}</DialogTitle>
          <DialogDescription>
            Tick the cities where users should see {categoryName} in their
            Spots tab.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {allCities.filter((c) => c.is_active).map((c) => (
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
