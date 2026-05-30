import { Badge } from "@/components/ui/badge";

type StatusType =
  | "pending"
  | "reviewed"
  | "dismissed"
  | "active"
  | "canceled"
  | "past_due"
  | "paid"
  | "free"
  | "live"
  | "offline";

const statusConfig: Record<
  StatusType,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  reviewed: { label: "Reviewed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  canceled: { label: "Canceled", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  past_due: { label: "Past Due", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  paid: { label: "Paid", className: "bg-wink/15 text-wink" },
  free: { label: "Free", className: "bg-muted text-muted-foreground" },
  live: { label: "Live", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground" },
};

export function AdminBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as StatusType];
  return (
    <Badge
      variant="outline"
      className={cfg?.className ?? "bg-muted text-muted-foreground"}
    >
      {cfg?.label ?? status}
    </Badge>
  );
}
