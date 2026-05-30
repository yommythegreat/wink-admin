import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Root redirects to admin login (or admin dashboard if already authenticated).
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/admin" });
    } else {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => null,
});
