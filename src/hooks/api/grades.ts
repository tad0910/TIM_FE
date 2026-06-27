import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  batchCreateOrUpdateGrades,
  getGradeHistory,
  getModuleGradebook,
  type BatchGradeUpdateRequest,
  type GradeHistoryDTO,
  type GradebookDTO,
} from "../../services/gradeApi";
import { queryKeys } from "./queryKeys";

type BaseQueryOptions = {
  enabled?: boolean;
};

type GradebookOptions = {
  entryDate?: string | null;
  missingEntryDateOnly?: boolean;
};

const defaultQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
} as const;

export function useModuleGradebook(
  classModuleId: number | null,
  page: number,
  size: number,
  options?: GradebookOptions,
  queryOptions: BaseQueryOptions = { enabled: true }
) {
  const enabled = Boolean(classModuleId) && (queryOptions.enabled ?? true);

  return useQuery<GradebookDTO, Error>({
    queryKey: queryKeys.grades.gradebook(classModuleId, page, size, options),
    enabled,
    queryFn: async () => {
      if (!classModuleId) {
        throw new Error("Thiếu classModuleId");
      }
      return getModuleGradebook(classModuleId, page, size, options);
    },
    placeholderData: keepPreviousData,
    ...defaultQueryOptions,
  });
}

export function useModuleGradeHistory(
  classModuleId: number | null,
  queryOptions: BaseQueryOptions = { enabled: true }
) {
  const enabled = Boolean(classModuleId) && (queryOptions.enabled ?? true);

  return useQuery<GradeHistoryDTO[], Error>({
    queryKey: queryKeys.grades.moduleHistory(classModuleId),
    enabled,
    queryFn: async () => {
      if (!classModuleId) {
        throw new Error("Thiếu classModuleId");
      }

      const gradebook = await getModuleGradebook(classModuleId, 0, 1000);

      if (!gradebook?.students?.length) {
        return [];
      }

      const historyPromises = gradebook.students
        .map((s) => s.gradeId)
        .filter((id): id is number => Boolean(id))
        .map((gradeId) =>
          getGradeHistory(gradeId).catch(() => {
            return [] as GradeHistoryDTO[];
          })
        );

      const histories = await Promise.all(historyPromises);
      const merged = histories.flat();

      merged.sort((a, b) => {
        const timeA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
        const timeB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
        return timeB - timeA;
      });

      return merged;
    },
    ...defaultQueryOptions,
  });
}

export function useGradeMutations() {
  const queryClient = useQueryClient();

  const invalidateGradebook = async (classModuleId: number | null) => {
    await queryClient.invalidateQueries({
      queryKey: ["grades", "gradebook", classModuleId],
    });
  };

  const invalidateModuleHistory = async (classModuleId: number | null) => {
    await queryClient.invalidateQueries({
      queryKey: ["grades", "module-history", classModuleId],
    });
  };

  const saveGradesMutation = useMutation({
    mutationFn: (payload: BatchGradeUpdateRequest) =>
      batchCreateOrUpdateGrades(payload),
    onSuccess: async (_, variables) => {
      const classModuleId = variables.classModuleId ?? null;
      await Promise.all([
        invalidateGradebook(classModuleId),
        invalidateModuleHistory(classModuleId),
      ]);
    },
  });

  return {
    saveGradesMutation,
  };
}
