import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import studentJobSettingsApi, {
  type UserJobSettingsDTO,
} from "../services/studentJobSettingsApi";

interface UseStudentJobSettingsResult {
  jobInterestEnabled: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setJobInterestEnabled: (next: boolean) => Promise<void>;
  updating: boolean;
}

export default function useStudentJobSettings(): UseStudentJobSettingsResult {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["studentJobSettings", "me"], []);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<UserJobSettingsDTO, unknown>({
    queryKey,
    queryFn: () => studentJobSettingsApi.getMySettings(),
    staleTime: 1000 * 30,
  });

  const mutation = useMutation<
    UserJobSettingsDTO,
    unknown,
    boolean,
    { previous: UserJobSettingsDTO | undefined }
  >({
    mutationFn: (next) => studentJobSettingsApi.updateMySettings(next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserJobSettingsDTO>(queryKey);

      queryClient.setQueryData<UserJobSettingsDTO>(queryKey, {
        jobInterestEnabled: next,
      });

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
    },
  });

  const refresh = useCallback(async () => {
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  }, [refetch]);

  const setJobInterestEnabled = useCallback(
    async (next: boolean) => {
      await mutation.mutateAsync(next);
    },
    [mutation]
  );

  const queryErrorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Không thể tải cài đặt việc làm"
        : null;

  const mutationError = mutation.error;
  const mutationErrorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "Không thể cập nhật cài đặt việc làm"
        : null;

  return {
    jobInterestEnabled: Boolean(data?.jobInterestEnabled),
    loading: isLoading || isFetching,
    error: mutationErrorMessage ?? queryErrorMessage,
    refresh,
    setJobInterestEnabled,
    updating: mutation.isPending,
  };
}
