import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminJobOverviewApi, type AdminJobOverviewQuery } from "../../services/adminJobOverviewApi";
import adminJobTrackingApi from "../../services/adminJobTrackingApi";
import adminJobLeadAdminApi from "../../services/adminJobLeadAdminApi";
import type {
  AdminJobLeadDetail,
  AdminJobOverviewSummary,
  AdminJobTrackingRow,
  CreateJobLeadPayload,
} from "../../types/job";
import { queryKeys } from "./queryKeys";

const JOB_DATA_STALE_TIME = 60_000;

interface JobTrackingOptions {
  enabled?: boolean;
}

interface JobLeadsOptions {
  enabled?: boolean;
}

export function useJobOverviewQuery(filters?: AdminJobOverviewQuery) {
  return useQuery<AdminJobOverviewSummary>({
    queryKey: queryKeys.jobs.overview(filters),
    queryFn: () => adminJobOverviewApi.getSummary(filters),
    placeholderData: keepPreviousData,
    staleTime: JOB_DATA_STALE_TIME,
  });
}

export function useJobTrackingQuery(classId: number | null, options: JobTrackingOptions = {}) {
  const enabled = (options.enabled ?? true) && Boolean(classId);

  return useQuery<AdminJobTrackingRow[]>({
    queryKey: queryKeys.jobs.tracking(classId ?? null),
    queryFn: () => adminJobTrackingApi.list(classId!),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: JOB_DATA_STALE_TIME,
    select: (rows) => rows ?? [],
  });
}

export function useJobLeadsQuery(
  classId: number | null,
  studentId: number | null,
  options: JobLeadsOptions = {}
) {
  const enabled = (options.enabled ?? true) && Boolean(classId) && Boolean(studentId);

  return useQuery<AdminJobLeadDetail[]>({
    queryKey: queryKeys.jobs.leads(classId ?? null, studentId ?? null),
    queryFn: () => adminJobLeadAdminApi.listByStudent(classId!, studentId!),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: JOB_DATA_STALE_TIME,
    select: (rows) => rows ?? [],
  });
}

export function useJobInterestMutation(classId: number | null) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.jobs.tracking(classId ?? null);

  return useMutation<
    AdminJobTrackingRow,
    unknown,
    { studentId: number; jobInterest: boolean },
    { previousRows: AdminJobTrackingRow[] }
  >({
    mutationFn: ({ studentId, jobInterest }) =>
      adminJobTrackingApi.updateJobInterest(classId!, studentId, jobInterest),
    onMutate: async ({ studentId, jobInterest }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData<AdminJobTrackingRow[]>(queryKey) ?? [];

      queryClient.setQueryData<AdminJobTrackingRow[]>(queryKey, (rows = []) =>
        rows.map((row) => (row.studentId === studentId ? { ...row, jobInterest } : row))
      );

      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(queryKey, context.previousRows);
      }
    },
    onSuccess: (updatedRow) => {
      queryClient.setQueryData<AdminJobTrackingRow[]>(queryKey, (rows = []) =>
        rows.map((row) => (row.studentId === updatedRow.studentId ? updatedRow : row))
      );
    },
  });
}

export function useCreateJobLeadMutation(classId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<AdminJobLeadDetail, unknown, { studentId: number; payload: CreateJobLeadPayload }>(
    {
      mutationFn: ({ studentId, payload }) => adminJobLeadAdminApi.create(classId!, studentId, payload),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobs.leads(classId ?? null, variables.studentId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.tracking(classId ?? null) });
      },
    }
  );
}
