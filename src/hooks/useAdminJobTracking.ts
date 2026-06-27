import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminJobTrackingApi from "../services/adminJobTrackingApi";
import type { AdminJobTrackingRow } from "../types/job";

interface UseAdminJobTrackingOptions {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface UseAdminJobTrackingResult {
  rows: AdminJobTrackingRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleJobInterest: (studentId: number, jobInterest: boolean) => Promise<void>;
  updating: boolean;
}

export default function useAdminJobTracking(
  classId?: number | null,
  options: UseAdminJobTrackingOptions = {}
): UseAdminJobTrackingResult {
  const queryClient = useQueryClient();
  const isEnabled = (options.enabled ?? true) && typeof classId === "number" && classId > 0;
  const refetchInterval =
    options.refetchIntervalMs === false ? false : options.refetchIntervalMs ?? false;

  const queryKey = useMemo(
    () => ["adminJobTracking", classId ?? "none"],
    [classId]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AdminJobTrackingRow[], unknown>({
    queryKey,
    queryFn: () => adminJobTrackingApi.list(classId!),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 10,
    refetchInterval,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    select: (rows) => rows ?? [],
  });

  const mutation = useMutation<
    AdminJobTrackingRow,
    unknown,
    { studentId: number; jobInterest: boolean },
    { previousRows: AdminJobTrackingRow[] }
  >({
    mutationFn: ({ studentId, jobInterest }) =>
      adminJobTrackingApi.updateJobInterest(classId!, studentId, jobInterest),
    onMutate: async ({ studentId, jobInterest }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRows =
        queryClient.getQueryData<AdminJobTrackingRow[]>(queryKey) ?? [];

      queryClient.setQueryData<AdminJobTrackingRow[]>(queryKey, (prev = []) =>
        prev.map((row) =>
          row.studentId === studentId ? { ...row, jobInterest } : row
        )
      );

      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(queryKey, context.previousRows);
      }
    },
    onSuccess: (updatedRow) => {
      queryClient.setQueryData<AdminJobTrackingRow[]>(queryKey, (prev = []) =>
        prev.map((row) =>
          row.studentId === updatedRow.studentId ? updatedRow : row
        )
      );
    },
  });

  const refresh = useCallback(async () => {
    if (!isEnabled) {
      return;
    }
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  }, [isEnabled, refetch]);

  const toggleJobInterest = useCallback(
    async (studentId: number, jobInterest: boolean) => {
      if (!isEnabled) {
        return;
      }
      await mutation.mutateAsync({ studentId, jobInterest });
    },
    [isEnabled, mutation]
  );

  const queryErrorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Không thể tải dữ liệu theo dõi việc làm"
        : null;

  const mutationError = mutation.error;
  const mutationErrorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "Không thể cập nhật nhu cầu tìm việc"
        : null;

  return {
    rows: isEnabled ? data ?? [] : [],
    loading: isEnabled ? isLoading : false,
    error: mutationErrorMessage ?? queryErrorMessage,
    refresh,
    toggleJobInterest,
    updating: mutation.isPending,
  };
}
