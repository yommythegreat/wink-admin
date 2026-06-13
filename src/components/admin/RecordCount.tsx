/**
 * Tiny header right-slot element that shows the total record count on a list
 * page (e.g. "42 cities", "8 categories"). Passed into <AdminHeader right={...} />.
 *
 * Renders nothing while the count is undefined (initial load) so the header
 * doesn't flash a placeholder.
 */
export function RecordCount({
  count,
  label,
}: {
  count: number | undefined;
  label: string;
}) {
  if (count === undefined) return null;
  return (
    <span className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{count}</span> {label}
    </span>
  );
}
