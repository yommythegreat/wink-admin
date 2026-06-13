import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  getSpotCategories,
  createSpotCategory,
  updateSpotCategory,
  deleteSpotCategory,
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
import type { AdminSpotCategoryRow } from "@/integrations/supabase/admin-types";

// NOTE: this is the LIST page for /admin/categories. Layout lives in
// admin.categories.tsx (sibling), which mounts <Outlet /> so this index and
// the category detail (admin.categories.$categoryId.tsx) can both render.
export const Route = createFileRoute("/_authenticated/_admin/admin/categories/")({
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: categories, isLoading } = useAdminQuery(
    ["admin-spot-categories"],
    (t) => getSpotCategories({ data: { token: t } }),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminSpotCategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSpotCategoryRow | null>(null);

  // Auto-fill sort_order for new categories: next available slot.
  const nextSortOrder = useMemo(() => {
    const max = (categories ?? []).reduce((m, c) => Math.max(m, c.sort_order), 0);
    return max + 10;
  }, [categories]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-spot-categories"] });

  async function toggleEnabled(cat: AdminSpotCategoryRow) {
    try {
      await updateSpotCategory({ data: { token, id: cat.id, is_active: !cat.is_active } });
      toast.success(cat.is_active ? `${cat.name} disabled` : `${cat.name} enabled`);
      invalidate();
    } catch (err) {
      toast.error("Couldn't toggle: " + errMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSpotCategory({ data: { token, id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      invalidate();
    } catch (err) {
      toast.error("Couldn't delete: " + errMessage(err));
    }
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Categories" }]}
        right={<RecordCount count={categories?.length} label="categories" />}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          One global taxonomy used across every city. Disable a category to
          hide it everywhere without losing its city assignments. Click a
          category to see which cities it&apos;s assigned to.
        </p>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add category</Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Category name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded-full bg-surface" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (categories ?? []).map((cat, idx) => (
                    <TableRow
                      key={cat.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({ to: "/admin/categories/$categoryId", params: { categoryId: cat.id } })
                      }
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <AdminBadge status={cat.is_active ? "active" : "offline"} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(cat.created_at).toLocaleDateString()}
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
                                navigate({ to: "/admin/categories/$categoryId", params: { categoryId: cat.id } })
                              }
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditTarget(cat)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleEnabled(cat)}>
                              {cat.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(cat)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && (categories ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No categories yet. Click &quot;+ Add category&quot; to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CategoryFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        token={token}
        onSaved={invalidate}
        mode="create"
        defaultSortOrder={nextSortOrder}
      />
      <CategoryFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        token={token}
        onSaved={invalidate}
        mode="edit"
        category={editTarget ?? undefined}
      />

      <AdminConfirmAction
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "category"}?`}
        description="This cannot be undone. If any Spots still use this category the delete will fail with details."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  token,
  onSaved,
  mode,
  category,
  defaultSortOrder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  onSaved: () => void;
  mode: "create" | "edit";
  category?: AdminSpotCategoryRow;
  defaultSortOrder?: number;
}) {
  const [draft, setDraft] = useState({ name: "", slug: "", icon: "", sort_order: "100" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      setDraft({
        name: category.name,
        slug: category.slug,
        icon: category.icon ?? "",
        sort_order: String(category.sort_order),
      });
    } else {
      setDraft({ name: "", slug: "", icon: "", sort_order: String(defaultSortOrder ?? 100) });
    }
  }, [open, mode, category, defaultSortOrder]);

  async function submit() {
    const order = Number(draft.sort_order);
    if (!draft.name || (mode === "create" && !draft.slug) || !Number.isFinite(order)) {
      toast.error("Fill name, slug, and a numeric sort order.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createSpotCategory({
          data: { token, name: draft.name, slug: draft.slug, icon: draft.icon || null, sort_order: order },
        });
        toast.success(`${draft.name} added`);
      } else if (category) {
        await updateSpotCategory({
          data: { token, id: category.id, name: draft.name, icon: draft.icon || null, sort_order: order },
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
          <DialogTitle>{mode === "create" ? "Add category" : `Edit ${category?.name ?? ""}`}</DialogTitle>
          <DialogDescription>
            Categories are global. The icon + sort_order are optional — defaults
            work for most cases. Icon takes a Lucide icon name (e.g. <code>coffee</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DialogField label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="Cafés" />
          <DialogField
            label="Slug"
            value={draft.slug}
            onChange={(v) => setDraft((d) => ({ ...d, slug: v }))}
            placeholder="cafes"
            disabled={mode === "edit"}
          />
          <DialogField label="Icon (Lucide name)" value={draft.icon} onChange={(v) => setDraft((d) => ({ ...d, icon: v }))} placeholder="coffee" />
          <DialogField label="Sort order" value={draft.sort_order} onChange={(v) => setDraft((d) => ({ ...d, sort_order: v }))} placeholder="100" />
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
