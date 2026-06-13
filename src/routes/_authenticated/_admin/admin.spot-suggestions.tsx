import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecordCount } from "@/components/admin/RecordCount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getSpotSuggestions,
  approveSpotSuggestion,
  rejectSpotSuggestion,
  convertSpotSuggestion,
  getCities,
  getSpotCategories,
} from "@/server-fns/spots";
import type { AdminSpotSuggestionRow } from "@/integrations/supabase/admin-types";
import { errMessage } from "@/lib/err-message";

export const Route = createFileRoute(
  "/_authenticated/_admin/admin/spot-suggestions",
)({
  component: AdminSpotSuggestionsPage,
});

const STATUS_FILTERS = ["pending", "approved", "rejected", "converted", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function AdminSpotSuggestionsPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("pending");

  const { data, isLoading } = useAdminQuery(
    ["admin-spot-suggestions", status],
    (t) => getSpotSuggestions({ data: { token: t, status } }),
  );

  const { data: cities } = useAdminQuery(
    ["admin-cities"],
    (t) => getCities({ data: { token: t } }),
  );
  const { data: categories } = useAdminQuery(
    ["admin-spot-categories"],
    (t) => getSpotCategories({ data: { token: t } }),
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-spot-suggestions"] });

  return (
    <div className="flex flex-col">
      <AdminHeader
        crumbs={[{ label: "Spot suggestions" }]}
        right={<RecordCount count={data?.length} label="suggestions" />}
      />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          User-submitted Spot ideas. Approve = signal acknowledgement. Reject = decline.
          Convert = create a real Spot in one click and notify the suggester.
        </p>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                "rounded-full px-3 py-1 text-xs " +
                (status === s
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground")
              }
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No suggestions in this view.</p>
          )}
          {(data ?? []).map((s, idx) => (
            <SuggestionRow
              key={s.id}
              index={idx + 1}
              suggestion={s}
              token={token}
              cities={cities ?? []}
              categories={categories ?? []}
              onChange={invalidate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type Lookup = { id: string; name: string }[];

function SuggestionRow({
  index,
  suggestion,
  token,
  cities,
  categories,
  onChange,
}: {
  index: number;
  suggestion: AdminSpotSuggestionRow;
  token: string;
  cities: Lookup;
  categories: Lookup;
  onChange: () => void;
}) {
  const [converting, setConverting] = useState(false);
  const [draft, setDraft] = useState({
    city_id: suggestion.city_id ?? "",
    category_id: suggestion.category_id ?? "",
    name: suggestion.name,
    address: suggestion.address ?? "",
    description: suggestion.notes ?? "",
    cover_image_url: "",
  });
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await approveSpotSuggestion({ data: { token, id: suggestion.id } });
      toast.success("Approved");
      onChange();
    } catch (err) {
      toast.error("Couldn't approve: " + errMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    setBusy(true);
    try {
      await rejectSpotSuggestion({ data: { token, id: suggestion.id } });
      toast.success("Rejected");
      onChange();
    } catch (err) {
      toast.error("Couldn't reject: " + errMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function convert() {
    if (!draft.city_id || !draft.category_id || !draft.name) {
      toast.error("Pick a city, a category, and confirm the name.");
      return;
    }
    setBusy(true);
    try {
      await convertSpotSuggestion({
        data: {
          token,
          id: suggestion.id,
          city_id: draft.city_id,
          category_id: draft.category_id,
          name: draft.name,
          description: draft.description || null,
          address: draft.address || null,
          cover_image_url: draft.cover_image_url || null,
        },
      });
      toast.success("Converted to Spot");
      setConverting(false);
      onChange();
    } catch (err) {
      toast.error("Couldn't convert: " + errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">#{index}</span>
            <h3 className="font-medium">{suggestion.name}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {suggestion.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            from {suggestion.submitter_name ?? "?"} ({suggestion.submitter_email ?? "?"}) ·{" "}
            {new Date(suggestion.created_at).toLocaleString()}
          </p>
          {suggestion.address && (
            <p className="mt-1 truncate text-xs text-muted-foreground">📍 {suggestion.address}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Suggested category: <code>{suggestion.category_text ?? suggestion.category_id ?? "—"}</code> · Suggested city:{" "}
            <code>{suggestion.city_text ?? suggestion.city_id ?? "—"}</code>
          </p>
          {suggestion.notes && (
            <p className="mt-2 text-sm">{suggestion.notes}</p>
          )}
        </div>
        {suggestion.status === "pending" && (
          <div className="flex shrink-0 flex-col gap-1">
            <Button size="sm" onClick={() => setConverting((v) => !v)} disabled={busy}>
              {converting ? "Close" : "Convert to Spot"}
            </Button>
            <Button size="sm" variant="outline" onClick={approve} disabled={busy}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={reject} disabled={busy}>
              Reject
            </Button>
          </div>
        )}
      </div>

      {converting && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">City</Label>
            <select
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              value={draft.city_id}
              onChange={(e) => setDraft((d) => ({ ...d, city_id: e.target.value }))}
            >
              <option value="">Select…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <select
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              value={draft.category_id}
              onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value }))}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Field label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <Field label="Address" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} />
          <div className="sm:col-span-2">
            <Field label="Description" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
          </div>
          <div className="sm:col-span-2">
            <Field label="Cover image URL" value={draft.cover_image_url} onChange={(v) => setDraft((d) => ({ ...d, cover_image_url: v }))} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={convert} disabled={busy}>
              {busy ? "Converting…" : "Create Spot"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
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
