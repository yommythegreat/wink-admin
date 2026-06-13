import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { RecordCount } from "@/components/admin/RecordCount";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getCities,
  createCity,
  updateCity,
  deleteCity,
  publishCityLaunch,
} from "@/server-fns/spots";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { errMessage } from "@/lib/err-message";
import type { AdminCityRow } from "@/integrations/supabase/admin-types";

// NOTE: this is the LIST page for /admin/cities.
// The layout that hosts the child Outlet for the detail page lives in
// admin.cities.tsx (sibling). See plan: "Fix invisible city/category detail
// pages" — without that layout in place, the detail route can't render.
export const Route = createFileRoute("/_authenticated/_admin/admin/cities/")({
  component: AdminCitiesPage,
});

function AdminCitiesPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: cities, isLoading } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCityRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCityRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-cities"] });

  // Enable a city = mark it active AND fire the launch-push to anyone whose
  // stored location is in range. notify_city_launch only pushes to users
  // with notified_at=null, so toggling enable on/off doesn't re-spam them.
  // Disable just flips is_active; no push.
  async function toggleEnabled(city: AdminCityRow) {
    try {
      await updateCity({ data: { token, id: city.id, is_active: !city.is_active } });
      if (!city.is_active) {
        toast.success(`${city.name} enabled`);
        try {
          const { notified } = await publishCityLaunch({ data: { token, city_id: city.id } });
          if (notified > 0) {
            toast.success(`Notified ${notified} user${notified === 1 ? "" : "s"} about ${city.name}`);
          }
        } catch (pushErr) {
          toast.error("Enabled, but couldn't notify users: " + errMessage(pushErr));
        }
      } else {
        toast.success(`${city.name} disabled`);
      }
      invalidate();
    } catch (err) {
      toast.error("Couldn't toggle: " + errMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCity({ data: { token, id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      invalidate();
    } catch (err) {
      toast.error("Couldn't delete: " + errMessage(err));
    }
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Cities" }]}
        right={<RecordCount count={cities?.length} label="cities" />}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Each city defines a launch zone (center coordinates + radius). A
          user&apos;s location falls inside a city when it&apos;s within{" "}
          <code>radius_m</code> of the center. Enabling a city publishes it to
          users and notifies anyone whose location was already in range.
        </p>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add city</Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>City name</TableHead>
                <TableHead className="text-right">Longitude</TableHead>
                <TableHead className="text-right">Latitude</TableHead>
                <TableHead className="text-right">Radius (km)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (cities ?? []).map((city, idx) => (
                    <TableRow
                      key={city.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({ to: "/admin/cities/$cityId", params: { cityId: city.id } })
                      }
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {city.center_lng.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {city.center_lat.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {(city.radius_m / 1000).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <AdminBadge status={city.is_active ? "active" : "offline"} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(city.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({ to: "/admin/cities/$cityId", params: { cityId: city.id } })
                              }
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditTarget(city)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleEnabled(city)}>
                              {city.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(city)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && (cities ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No cities yet. Click &quot;+ Add city&quot; to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CityFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        token={token}
        onSaved={invalidate}
        mode="create"
      />

      <CityFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        token={token}
        onSaved={invalidate}
        mode="edit"
        city={editTarget ?? undefined}
      />

      <AdminConfirmAction
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "city"}?`}
        description="This cannot be undone. If any Spots still belong to this city the delete will fail and tell you which ones."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// City Add/Edit modal — the same form serves both modes. Empty defaults +
// mode='create' for Add; pre-populated + mode='edit' for Edit. Submit
// dispatches to createCity or updateCity accordingly.
function CityFormDialog({
  open,
  onOpenChange,
  token,
  onSaved,
  mode,
  city,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  onSaved: () => void;
  mode: "create" | "edit";
  city?: AdminCityRow;
}) {
  const [draft, setDraft] = useState({
    name: "",
    slug: "",
    country: "",
    center_lat: "",
    center_lng: "",
    radius_m: "25000",
  });
  const [saving, setSaving] = useState(false);

  // Re-seed whenever the dialog opens — create-mode resets; edit-mode loads
  // the target city's current values so the form mirrors the row.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && city) {
      setDraft({
        name: city.name,
        slug: city.slug,
        country: city.country ?? "",
        center_lat: String(city.center_lat),
        center_lng: String(city.center_lng),
        radius_m: String(city.radius_m),
      });
    } else {
      setDraft({ name: "", slug: "", country: "", center_lat: "", center_lng: "", radius_m: "25000" });
    }
  }, [open, mode, city]);

  async function submit() {
    const lat = Number(draft.center_lat);
    const lng = Number(draft.center_lng);
    const radius = Number(draft.radius_m);
    if (!draft.name || (mode === "create" && !draft.slug) || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      toast.error("Fill name, slug, and valid numbers for coords + radius.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createCity({
          data: {
            token,
            name: draft.name,
            slug: draft.slug,
            country: draft.country.length === 2 ? draft.country : null,
            center_lat: lat,
            center_lng: lng,
            radius_m: radius,
          },
        });
        toast.success(`${draft.name} added`);
      } else if (city) {
        await updateCity({
          data: {
            token,
            id: city.id,
            name: draft.name,
            country: draft.country.length === 2 ? draft.country : null,
            center_lat: lat,
            center_lng: lng,
            radius_m: radius,
          },
        });
        toast.success("Saved");
      }
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add city" : `Edit ${city?.name ?? ""}`}</DialogTitle>
          <DialogDescription>
            Coordinates + radius define the area we consider this city. A user
            is &quot;in&quot; the city when their location is within the radius of the
            center.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DialogField label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="Lagos" />
          <DialogField
            label="Slug"
            value={draft.slug}
            onChange={(v) => setDraft((d) => ({ ...d, slug: v }))}
            placeholder="lagos"
            disabled={mode === "edit"}
          />
          <DialogField label="Country (ISO 2)" value={draft.country} onChange={(v) => setDraft((d) => ({ ...d, country: v }))} placeholder="NG" />
          <DialogField label="Radius (m)" value={draft.radius_m} onChange={(v) => setDraft((d) => ({ ...d, radius_m: v }))} placeholder="25000" />
          <DialogField label="Center latitude" value={draft.center_lat} onChange={(v) => setDraft((d) => ({ ...d, center_lat: v }))} placeholder="6.5244" />
          <DialogField label="Center longitude" value={draft.center_lng} onChange={(v) => setDraft((d) => ({ ...d, center_lng: v }))} placeholder="3.3792" />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
