import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminRole } from "@/server-fns/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { ThemeToggle } from "@/components/wink/ThemeToggle";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already authenticated as admin, skip straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        const result = await checkAdminRole({
          data: { token: session.access_token },
        });
        if (result.isAdmin) {
          navigate({ to: "/admin" });
          return;
        }
      }
      setChecking(false);
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    // 1. Sign in via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(
      parsed.data,
    );

    if (authError || !authData.session) {
      setLoading(false);
      toast.error(authError?.message ?? "Sign-in returned no session.");
      return;
    }

    // 2. Verify admin role — sign out immediately if not an admin
    let result: { isAdmin: boolean };
    try {
      result = await checkAdminRole({
        data: { token: authData.session.access_token },
      });
    } catch (err) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Admin role check failed: " + (err instanceof Error ? err.message : String(err)));
      return;
    }

    if (!result.isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account doesn't have admin access.");
      return;
    }

    // 3. Authenticated + verified → go to dashboard
    navigate({ to: "/admin" });
  }

  if (checking) {
    // Avoid flicker while we check for an existing session
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background" />
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header
        className="flex items-center justify-end px-6 pt-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Admin brand mark */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
                wink
              </span>
              <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Admin
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in to access the admin dashboard.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Admin email"
              aria-label="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-wink text-base font-medium text-wink-foreground hover:opacity-90"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
