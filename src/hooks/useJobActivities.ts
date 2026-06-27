import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobActivityApi } from "../services/jobActivityApi";
import type {
  CreateJobActivityPayload,
  JobActivity,
  UpdateJobActivityNotePayload,
} from "../types";
import { ApiError } from "../utils/error";

interface UseJobActivitiesOptions {
  autoLoad?: boolean;
}

interface UseJobActivitiesResult {
  activities: JobActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createActivity: (
    payload: Omit<CreateJobActivityPayload, "jobLeadId"> & { jobLeadId?: number }
  ) => Promise<JobActivity | null>;
  updateNote: (payload: UpdateJobActivityNotePayload) => Promise<JobActivity | null>;
  updating: boolean;
}

export function useJobActivities(
  jobLeadId: number | null | undefined,
  options: UseJobActivitiesOptions = {}
): UseJobActivitiesResult {
  const { autoLoad = true } = options;
  const queryClient = useQueryClient();
  const enabled = Boolean(jobLeadId) && autoLoad;

  const queryKey = useMemo(
    () => ["jobActivities", jobLeadId ?? "none"],
    [jobLeadId]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<JobActivity[], unknown>({
    queryKey,
    enabled,
    queryFn: async () => {
      if (!jobLeadId) {
        return [];
      }
      try {
        return await jobActivityApi.list(jobLeadId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          return [];
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 2,
    select: (activities) => activities ?? [],
  });

  const createMutation = useMutation<
    JobActivity,
    unknown,
    Omit<CreateJobActivityPayload, "jobLeadId"> & { jobLeadId?: number },
    { previous: JobActivity[] }
  >({
    mutationFn: async (payload) => {
      const targetLeadId = payload.jobLeadId ?? jobLeadId;
      if (!targetLeadId) {
        throw new Error("Thiếu jobLeadId để tạo hoạt động");
      }
      return jobActivityApi.create({
        ...payload,
        jobLeadId: targetLeadId,
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobActivity[]>(queryKey) ?? [];
      return { previous };
    },
    onSuccess: (activity) => {
      queryClient.setQueryData<JobActivity[]>(queryKey, (prev = []) => [activity, ...prev]);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  const updateMutation = useMutation<
    JobActivity,
    unknown,
    UpdateJobActivityNotePayload,
    { previous: JobActivity[] }
  >({
    mutationFn: (payload) => jobActivityApi.updateNote(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobActivity[]>(queryKey) ?? [];

      queryClient.setQueryData<JobActivity[]>(queryKey, (prev = []) =>
        prev.map((activity) =>
          activity.id === payload.activityId
            ? { ...activity, note: payload.note }
            : activity
        )
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<JobActivity[]>(queryKey, (prev = []) =>
        prev.map((activity) =>
          activity.id === updated.id ? { ...activity, note: updated.note } : activity
        )
      );
    },
  });

  const refresh = useCallback(async () => {
    if (!jobLeadId) {
      queryClient.setQueryData<JobActivity[]>(queryKey, []);
      return;
    }
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  }, [jobLeadId, queryClient, queryKey, refetch]);

  const createActivity = useCallback(
    async (
      payload: Omit<CreateJobActivityPayload, "jobLeadId"> & { jobLeadId?: number }
    ): Promise<JobActivity | null> => {
      try {
        return await createMutation.mutateAsync(payload);
      } catch (err) {
        console.error("[useJobActivities] Failed to create activity", err);
        return null;
      }
    },
    [createMutation]
  );

  const updateNote = useCallback(
    async (payload: UpdateJobActivityNotePayload): Promise<JobActivity | null> => {
      try {
        return await updateMutation.mutateAsync(payload);
      } catch (err) {
        console.error("[useJobActivities] Failed to update note", err);
        return null;
      }
    },
    [updateMutation]
  );

  const queryErrorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Không thể tải nhật ký hoạt động"
        : null;

  const mutationError = createMutation.error || updateMutation.error;
  const mutationErrorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "Không thể cập nhật nhật ký hoạt động"
        : null;

  return {
    activities: jobLeadId ? data ?? [] : [],
    loading: enabled ? isLoading : false,
    error: mutationErrorMessage ?? queryErrorMessage,
    refresh,
    createActivity,
    updateNote,
    updating: createMutation.isPending || updateMutation.isPending,
  };
}

export default useJobActivities;
