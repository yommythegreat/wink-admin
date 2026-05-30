import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: () => <Outlet />,
});
