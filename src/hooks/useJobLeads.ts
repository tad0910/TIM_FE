import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobLeadApi } from "../services/jobLeadApi";
import type { JobLead, CreateJobLeadPayload } from "../types";
import { useAuthStore } from "../store/useAuthStore";

interface UseJobLeadsOptions {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface UseJobLeadsResult {
  leads: JobLead[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createLead: (payload: CreateJobLeadPayload) => Promise<JobLead | null>;
  deleteLead: (leadId: number) => Promise<boolean>;
}

export function useJobLeads(options: UseJobLeadsOptions = {}): UseJobLeadsResult {
  const studentId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const numericStudentId = useMemo(() => {
    if (typeof studentId === "number" && Number.isFinite(studentId)) {
      return studentId;
    }
    if (typeof studentId === "string") {
      const parsed = Number(studentId);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [studentId]);
  const enabledBase = typeof numericStudentId === "number" && Number.isFinite(numericStudentId) && numericStudentId > 0;
  const enabled = (options.enabled ?? true) && enabledBase;
  const refetchInterval =
    options.refetchIntervalMs === false ? false : options.refetchIntervalMs ?? false;

  const queryKey = useMemo(
    () => ["jobLeads", enabled ? numericStudentId! : "anonymous"],
    [enabled, numericStudentId]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<JobLead[], unknown>({
    queryKey,
    enabled,
    queryFn: () => jobLeadApi.getMyLeads(numericStudentId!),
    staleTime: 1000 * 60 * 5,
    refetchInterval,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    select: (leads) => leads ?? [],
  });

  const createMutation = useMutation<
    JobLead,
    unknown,
    CreateJobLeadPayload,
    { previous: JobLead[]; tempId: number }
  >({
    mutationFn: (payload) => jobLeadApi.create(numericStudentId!, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobLead[]>(queryKey) ?? [];

      const tempId = -Date.now();

      queryClient.setQueryData<JobLead[]>(queryKey, (prev = []) => [
        {
          id: tempId,
          companyName: payload.companyName,
          shortName: payload.shortName,
          address: payload.address,
          website: payload.website,
          statusCode: null,
          statusLabel: null,
          status: "PENDING",
          isFromAdmin: false,
          date: new Date().toISOString(),
        },
        ...prev,
      ]);

      return { previous, tempId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (newLead, _variables, context) => {
      queryClient.setQueryData<JobLead[]>(queryKey, (prev = []) => {
        const withoutTemp = context?.tempId
          ? prev.filter((lead) => lead.id !== context.tempId)
          : prev;
        return [newLead, ...withoutTemp];
      });
    },
  });

  const deleteMutation = useMutation<
    string,
    unknown,
    number,
    { previous: JobLead[] }
  >({
    mutationFn: (leadId) => jobLeadApi.delete(leadId, numericStudentId!),
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobLead[]>(queryKey) ?? [];

      queryClient.setQueryData<JobLead[]>(queryKey, (prev = []) =>
        prev.filter((lead) => lead.id !== leadId)
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  }, [enabled, refetch]);

  const createLead = useCallback(
    async (payload: CreateJobLeadPayload): Promise<JobLead | null> => {
      if (!enabled) return null;
      try {
        return await createMutation.mutateAsync(payload);
      } catch (err) {
        console.error("[useJobLeads] Failed to create job lead", err);
        return null;
      }
    },
    [createMutation, enabled]
  );

  const deleteLead = useCallback(
    async (leadId: number): Promise<boolean> => {
      if (!enabled) return false;
      try {
        await deleteMutation.mutateAsync(leadId);
        return true;
      } catch (err) {
        console.error("[useJobLeads] Failed to delete job lead", err);
        return false;
      }
    },
    [deleteMutation, enabled]
  );

  const queryErrorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Không thể tải danh sách cơ hội việc làm"
        : null;

  const mutationError =
    createMutation.error || deleteMutation.error;
  const mutationErrorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "Không thể thao tác cơ hội việc làm"
        : null;

  return {
    leads: enabled ? data ?? [] : [],
    loading: enabled ? isLoading || createMutation.isPending || deleteMutation.isPending : false,
    error: mutationErrorMessage ?? queryErrorMessage,
    refresh,
    createLead,
    deleteLead,
  };
}

export default useJobLeads;
