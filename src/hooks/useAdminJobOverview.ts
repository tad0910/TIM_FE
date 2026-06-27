import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminJobOverviewApi, type AdminJobOverviewQuery } from "../services/adminJobOverviewApi";
import type { AdminJobOverviewSummary } from "../types/job";

interface UseAdminJobOverviewResult {
  data: AdminJobOverviewSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminJobOverview(
  filters?: AdminJobOverviewQuery
): UseAdminJobOverviewResult {
  const queryKey = useMemo(
    () => (filters ? ["adminJobOverview", filters] : ["adminJobOverview"]),
    [filters]
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AdminJobOverviewSummary, unknown>({
    queryKey,
    queryFn: () => adminJobOverviewApi.getSummary(filters),
    staleTime: 1000 * 60 * 10,
  });

  const refresh = useCallback(async () => {
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  }, [refetch]);

  return {
    data: data ?? null,
    loading: isLoading || isFetching,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Không thể tải dữ liệu tổng quan"
          : null,
    refresh,
  };
}

export default useAdminJobOverview;
