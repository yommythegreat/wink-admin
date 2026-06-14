import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getAppConfig,
  updateAppConfig,
  type AppConfigRow,
} from "@/server-fns/admin";

export const Route = createFileRoute("/_authenticated/_admin/admin/config")({
  component: AdminConfigPage,
});

/* ----------------------- Section descriptors ----------------------- */
// Each section maps a config key → display label, type, helper text.
// Type "number" stores a plain number; type "numbers" stores a JSON array
// of numbers (comma-separated in the UI).
type FieldSpec =
  | { key: string; label: string; type: "number"; help: string }
  | { key: string; label: string; type: "numbers"; help: string };

const FIELDS: FieldSpec[] = [
  {
    key: "default_radius_m",
    label: "Default radius (m)",
    type: "number",
    help: "Discovery radius applied when a user has not set their own preference.",
  },
  {
    key: "radius_options_m",
    label: "Radius options (m)",
    type: "numbers",
    help: "Comma-separated list of allowed radius values shown in Settings.",
  },
  {
    key: "free_session_minutes",
    label: "Free user session length (min)",
    type: "number",
    help: "How long a free user's Go Live session runs before auto-ending.",
  },
  {
    key: "paid_session_options_minutes",
    label: "Premium session length options (min)",
    type: "numbers",
    help: "Comma-separated list shown to premium users in Settings.",
  },
  {
    key: "free_daily_session_cap",
    label: "Free user daily session cap",
    type: "number",
    help: "Maximum Go Live sessions a free user can start per calendar day.",
  },
];

/* ----------------------- Helpers ----------------------- */

function parseNumberInput(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseNumbersInput(raw: string): number[] | null {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

function formatValue(field: FieldSpec, value: unknown): string {
  if (field.type === "number") {
    return typeof value === "number" ? String(value) : "";
  }
  // numbers
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

/* ----------------------- Component ----------------------- */

type SpotRule = { order: number; text: string };

function AdminConfigPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data, isLoading, refetch } = useAdminQuery(
    ["admin-app-config"],
    (t) => getAppConfig({ data: { token: t } }),
  );

  // Local edit buffer per field key.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Spot rules editor state — kept separate from the numeric/array config
  // because its value shape is a list of objects, not a primitive.
  const [rules, setRules] = useState<SpotRule[]>([]);
  const [savingRules, setSavingRules] = useState(false);

  // Seed the draft from fetched values once.
  useEffect(() => {
    if (!data) return;
    const map = new Map<string, unknown>(
      (data as AppConfigRow[]).map((r) => [r.key, r.value]),
    );
    const next: Record<string, string> = {};
    for (const field of FIELDS) {
      next[field.key] = formatValue(field, map.get(field.key));
    }
    setDraft(next);
    const rawRules = map.get("spot_rules");
    if (Array.isArray(rawRules)) {
      setRules(
        (rawRules as Array<{ order?: number; text?: string; title?: string }>)
          .slice()
          // Fall back to title if a stale {title,body} row sneaks in pre-migration.
          .map((r, i) => ({
            order: typeof r.order === "number" ? r.order : i + 1,
            text: r.text ?? r.title ?? "",
          }))
          .sort((a, b) => a.order - b.order)
          .map((r, i) => ({ order: i + 1, text: r.text })),
      );
    }
  }, [data]);

  async function saveRules() {
    // Re-number sequentially before persisting so display order matches
    // storage order, regardless of any in-flight reordering.
    const normalized = rules.map((r, i) => ({
      order: i + 1,
      text: r.text.trim(),
    }));
    if (normalized.some((r) => !r.text)) {
      toast.error("Every rule needs text.");
      return;
    }
    setSavingRules(true);
    try {
      await updateAppConfig({
        data: {
          token,
          key: "spot_rules" as never,
          value: normalized,
        },
      });
      toast.success("Spot rules saved");
      await refetch();
    } catch (err) {
      toast.error("Couldn't save: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingRules(false);
    }
  }

  function moveRule(idx: number, dir: -1 | 1) {
    const next = rules.slice();
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRules(next);
  }

  async function handleSave(field: FieldSpec) {
    const raw = draft[field.key] ?? "";
    const parsed =
      field.type === "number" ? parseNumberInput(raw) : parseNumbersInput(raw);
    if (parsed === null) {
      toast.error(
        field.type === "number"
          ? "Enter a valid number"
          : "Enter a comma-separated list of numbers",
      );
      return;
    }
    if (!token) {
      toast.error("Session expired — please re-sign in.");
      return;
    }

    setSaving((s) => ({ ...s, [field.key]: true }));
    try {
      await updateAppConfig({
        data: {
          token,
          key: field.key as "default_radius_m",
          value: parsed,
        },
      });
      toast.success(`${field.label} saved`);
      await refetch();
    } catch (err) {
      toast.error(
        "Couldn't save: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving((s) => ({ ...s, [field.key]: false }));
    }
  }

  return (
    <div className="flex flex-col">
      <AdminHeader crumbs={[{ label: "Configurations" }]} />
      <div className="space-y-6 p-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Adjust the knobs that drive the user-facing app. Changes take effect on
            the next time a user loads a page (or up to 5 minutes for already-open
            sessions). Pricing and Stripe IDs are managed separately.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="text-sm font-medium text-foreground">Spot rules</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown to users in a modal every time they tap &quot;Join Spot&quot;.
            They must agree before joining. Order top-to-bottom.
          </p>

          <div className="mt-4 space-y-3">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-wink">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveRule(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveRule(idx, 1)}
                      disabled={idx === rules.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  className="mt-2"
                  placeholder="One sentence — the rule, as users will read it."
                  value={rule.text}
                  onChange={(e) =>
                    setRules(
                      rules.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRules([...rules, { order: rules.length + 1, text: "" }])
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add rule
            </Button>
            <Button onClick={saveRules} disabled={savingRules || isLoading} size="sm">
              {savingRules ? "Saving…" : "Save rules"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-xl border border-border bg-card p-5"
            >
              <Label
                htmlFor={`cfg-${field.key}`}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  id={`cfg-${field.key}`}
                  value={draft[field.key] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                  }
                  placeholder={field.type === "numbers" ? "10, 20, 30" : "0"}
                  disabled={isLoading}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => handleSave(field)}
                  disabled={isLoading || saving[field.key]}
                  size="sm"
                >
                  {saving[field.key] ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
