import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Skip on the server — localStorage doesn't exist there, so getSession()
    // always returns null and would incorrectly redirect logged-in admins.
    // The client-side useEffect catches genuinely unauthenticated sessions.
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
    }
  }, [loading, user, navigate]);

  // Render gate: don't mount the Outlet (which spins up the admin role check
  // and its own useEffect redirects) until auth state is fully resolved.
  // Eliminates the redirect race between this layout, _admin, and admin.login
  // that produced the /admin ↔ /admin/login URL bounce.
  if (loading || !user) {
    return <div className="min-h-[100dvh] bg-background" />;
  }

  return <Outlet />;
}
