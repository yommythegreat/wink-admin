import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdminRole } from "@/hooks/use-admin-role";
import { checkAdminRole } from "@/server-fns/admin";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ location }) => {
    // Mirror the _authenticated.tsx SSR skip — localStorage is unavailable server-side.
    // The client-side useEffect in AdminLayout catches unauthorised users as a second layer.
    if (typeof window === "undefined") return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }

    const result = await checkAdminRole({ data: { token: session.access_token } });
    if (!result.isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();

  // Client-side guard: redirect if the role check completes and user is not admin.
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate({ to: "/admin/login" }); return; }
    if (!isAdmin) { navigate({ to: "/admin/login" }); }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      <AdminNav />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
