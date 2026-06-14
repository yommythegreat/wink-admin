import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { RecordCount } from "@/components/admin/RecordCount";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getSpots,
  createSpot,
  updateSpot,
  archiveSpot,
  reactivateSpot,
  deleteSpot,
  getCities,
  getSpotCategories,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { errMessage } from "@/lib/err-message";
import type { AdminSpotRow } from "@/integrations/supabase/admin-types";

export const Route = createFileRoute("/_authenticated/_admin/admin/spots")({
  component: AdminSpotsPage,
});

function AdminSpotsPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const qc = useQueryClient();

  const [cityFilter, setCityFilter] = useState<string>("__all__");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data: cities } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );
  const { data: categories } = useAdminQuery(
    ["admin-spot-categories"],
    (t) => getSpotCategories({ data: { token: t } }),
  );

  const { data: spots, isLoading } = useAdminQuery(
    ["admin-spots", cityFilter, categoryFilter, includeArchived],
    (t) =>
      getSpots({
        data: {
          token: t,
          city_id: cityFilter === "__all__" ? undefined : cityFilter,
          category_id: categoryFilter === "__all__" ? undefined : categoryFilter,
          include_archived: includeArchived,
        },
      }),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminSpotRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSpotRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-spots"] });

  async function toggleEnabled(spot: AdminSpotRow) {
    try {
      if (spot.is_active) await archiveSpot({ data: { token, id: spot.id } });
      else await reactivateSpot({ data: { token, id: spot.id } });
      toast.success(spot.is_active ? `${spot.name} archived` : `${spot.name} enabled`);
      invalidate();
    } catch (err) {
      toast.error("Couldn't toggle: " + errMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSpot({ data: { token, id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      invalidate();
    } catch (err) {
      toast.error("Couldn't delete: " + errMessage(err));
    }
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Spots" }]}
        right={<RecordCount count={spots?.length} label="spots" />}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Each Spot belongs to one city and one category. Only categories that
          have been enabled for the Spot&apos;s city show up to users.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All cities</SelectItem>
                {(cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4"
            />
            Show archived
          </label>

          <div className="ml-auto">
            <Button size="sm" onClick={() => setAddOpen(true)}>+ Add spot</Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Spot name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Members</TableHead>
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
                : (spots ?? []).map((spot, idx) => (
                    <TableRow
                      key={spot.id}
                      className="cursor-pointer"
                      onClick={() => setEditTarget(spot)}
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{spot.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{spot.city_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{spot.category_name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{spot.member_count}</TableCell>
                      <TableCell>
                        <AdminBadge status={spot.is_active ? "active" : "offline"} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(spot.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem onClick={() => setEditTarget(spot)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleEnabled(spot)}>
                              {spot.is_active ? "Archive" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(spot)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && (spots ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No spots match the filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SpotFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        token={token}
        onSaved={invalidate}
        mode="create"
        cities={cities ?? []}
        categories={categories ?? []}
      />
      <SpotFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        token={token}
        onSaved={invalidate}
        mode="edit"
        cities={cities ?? []}
        categories={categories ?? []}
        spot={editTarget ?? undefined}
      />

      <AdminConfirmAction
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "spot"}?`}
        description="Memberships will cascade. Winks tagged with this spot keep their row but lose the spot reference. Use Archive if you'd rather keep history."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

type Lookup = { id: string; name: string }[];

function SpotFormDialog({
  open,
  onOpenChange,
  token,
  onSaved,
  mode,
  spot,
  cities,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  onSaved: () => void;
  mode: "create" | "edit";
  spot?: AdminSpotRow;
  cities: Lookup;
  categories: Lookup;
}) {
  const [draft, setDraft] = useState({
    city_id: "",
    category_id: "",
    name: "",
    description: "",
    address: "",
    cover_image_url: "",
    gallery_image_urls: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && spot) {
      setDraft({
        city_id: spot.city_id,
        category_id: spot.category_id,
        name: spot.name,
        description: spot.description ?? "",
        address: spot.address ?? "",
        cover_image_url: spot.cover_image_url ?? "",
        gallery_image_urls: spot.gallery_image_urls ?? [],
      });
    } else {
      setDraft({
        city_id: "",
        category_id: "",
        name: "",
        description: "",
        address: "",
        cover_image_url: "",
        gallery_image_urls: [],
      });
    }
  }, [open, mode, spot]);

  // Gallery upload only runs in edit mode — we need a spot id to namespace
  // the file path. Create mode hides the gallery section until the Spot
  // exists (see plan §3).
  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0 || mode !== "edit" || !spot) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${spot.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("spot-gallery")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("spot-gallery").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      setDraft((d) => ({ ...d, gallery_image_urls: [...d.gallery_image_urls, ...uploaded] }));
      toast.success(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error("Upload failed: " + errMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    if (!draft.city_id || !draft.category_id || !draft.name) {
      toast.error("Pick a city, a category, and enter a name.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createSpot({
          data: {
            token,
            city_id: draft.city_id,
            category_id: draft.category_id,
            name: draft.name,
            description: draft.description || null,
            address: draft.address || null,
            cover_image_url: draft.cover_image_url || null,
          },
        });
        toast.success(`${draft.name} created`);
      } else if (spot) {
        await updateSpot({
          data: {
            token,
            id: spot.id,
            city_id: draft.city_id,
            category_id: draft.category_id,
            name: draft.name,
            description: draft.description || null,
            address: draft.address || null,
            cover_image_url: draft.cover_image_url || null,
            gallery_image_urls: draft.gallery_image_urls,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add spot" : `Edit ${spot?.name ?? ""}`}</DialogTitle>
          <DialogDescription>
            Each spot belongs to one city and one category. Cover image URL is
            optional for now (upload coming later).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">City</Label>
            <Select value={draft.city_id} onValueChange={(v) => setDraft((d) => ({ ...d, city_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={draft.category_id} onValueChange={(v) => setDraft((d) => ({ ...d, category_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogField label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="iFitness Lekki" />
          <DialogField label="Address" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} placeholder="12 Akin Adesola St" />
          <div className="sm:col-span-2">
            <DialogField label="Description" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} placeholder="What members do here" />
          </div>
          <div className="sm:col-span-2">
            <DialogField label="Cover image URL" value={draft.cover_image_url} onChange={(v) => setDraft((d) => ({ ...d, cover_image_url: v }))} placeholder="https://…" />
          </div>

          {mode === "edit" && (
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Gallery images</Label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Shown to users in the &quot;Inside the Spot&quot; carousel on the Spot detail page. Section is hidden when empty.
              </p>

              {draft.gallery_image_urls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {draft.gallery_image_urls.map((url) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            gallery_image_urls: d.gallery_image_urls.filter((u) => u !== url),
                          }))
                        }
                        aria-label="Remove image"
                        className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow hover:bg-background"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => void handleGalleryUpload(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Add images"}
              </Button>
            </div>
          )}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
