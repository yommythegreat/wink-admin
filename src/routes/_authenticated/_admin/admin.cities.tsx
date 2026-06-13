import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout-only route. The list page lives in admin.cities.index.tsx and the
// detail page in admin.cities.$cityId.tsx. Both render through this Outlet —
// without it, the detail route can't mount.
export const Route = createFileRoute("/_authenticated/_admin/admin/cities")({
  component: () => <Outlet />,
});
