import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { programApi } from "../services/programApi";
import type { Program } from "../types/program";
import type { PageResponse } from "../types/pagination";

export interface AdminProgramsParams {
  page: number;
  size: number;
  sort?: string;
  keyword?: string;
}

export interface AdminProgramsQuery {
  params: AdminProgramsParams;
}

export interface AdminProgramsResult {
  data: PageResponse<Program> | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

const adminProgramsKey = (params: AdminProgramsParams) => [
  "admin-programs",
  {
    page: params.page,
    size: params.size,
    sort: params.sort,
    keyword: params.keyword ?? "",
  },
];

export function useAdminPrograms(params: AdminProgramsParams): AdminProgramsResult {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => adminProgramsKey(params), [params]);

  const query = useQuery<PageResponse<Program>, unknown>({
    queryKey,
    queryFn: async () => {
      const { page, size, sort, keyword } = params;
      const response = await programApi.getAllPrograms(page, size, sort ?? "id,asc");
      if (keyword?.trim()) {
        const filtered = response.content?.filter((program) =>
          program.name?.toLowerCase().includes(keyword.trim().toLowerCase())
        );
        return {
          ...response,
          content: filtered ?? [],
          totalElements: filtered?.length ?? 0,
          totalPages: 1,
          number: 0,
        };
      }
      return response;
    },
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}

export function useAdminProgramMutations(params: AdminProgramsParams) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => adminProgramsKey(params), [params]);

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createProgramMutation = useMutation({
    mutationFn: programApi.createProgram,
    onSuccess: invalidateList,
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<Program, "id"> }) =>
      programApi.updateProgram(id, data),
    onSuccess: invalidateList,
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id: number) => programApi.deleteProgram(id),
    onSuccess: invalidateList,
  });

  return {
    createProgramMutation,
    updateProgramMutation,
    deleteProgramMutation,
  };
}
