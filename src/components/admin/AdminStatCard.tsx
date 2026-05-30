import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

type AdminStatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  description?: string;
};

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  loading = false,
  description,
}: AdminStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
