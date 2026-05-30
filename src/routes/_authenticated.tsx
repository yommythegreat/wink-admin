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

  return <Outlet />;
}
