import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { checkAdminRole } from "@/server-fns/admin";
import type { AdminRoleValue } from "@/integrations/supabase/admin-types";

export function useAdminRole(): {
  isAdmin: boolean;
  role: AdminRoleValue | null;
  isLoading: boolean;
} {
  const { session, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.access_token) return { isAdmin: false, role: null };
      return checkAdminRole({ data: { token: session.access_token } });
    },
    enabled: !authLoading && !!session?.access_token,
    staleTime: 60_000,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    role: data?.role ?? null,
    isLoading: authLoading || isLoading,
  };
}
