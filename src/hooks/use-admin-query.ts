import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

/**
 * Thin wrapper over useQuery that automatically injects the current session's
 * access_token into every admin server function call. This keeps all admin page
 * components free of manual token threading.
 *
 * Usage:
 *   const { data, isLoading } = useAdminQuery(
 *     ['admin-dashboard'],
 *     (token) => getAdminDashboardStats({ data: { token } }),
 *   );
 */
export function useAdminQuery<TData>(
  queryKey: unknown[],
  queryFn: (token: string) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn" | "enabled">,
): UseQueryResult<TData> {
  const { session, loading } = useAuth();
  const token = session?.access_token ?? "";

  return useQuery<TData>({
    queryKey,
    queryFn: () => queryFn(token),
    enabled: !loading && !!token,
    ...options,
  });
}
