import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  moduleApi,
  type CreateModuleRequest,
  type UpdateModuleRequest,
} from "../services/moduleApi";
import type { Module } from "../types/module";
import type { PageResponse } from "../types/pagination";
import { queryKeys } from "./api/queryKeys";

export interface AdminModulesParams {
  page: number;
  size: number;
  sort?: string;
  keyword?: string;
}

const adminModulesKey = (params: AdminModulesParams) =>
  queryKeys.modules.list({
    page: params.page,
    size: params.size,
    sort: params.sort ?? "id,asc",
    keyword: params.keyword ?? "",
  });

interface UseAdminModulesResult {
  data: PageResponse<Module> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isPlaceholderData: boolean;
  refetch: () => Promise<void>;
}

export function useAdminModules(params: AdminModulesParams): UseAdminModulesResult {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => adminModulesKey(params),
    [params.page, params.size, params.sort, params.keyword]
  );

  const trimmedKeyword = params.keyword?.trim();

  const query = useQuery<PageResponse<Module>, Error>({
    queryKey,
    queryFn: () =>
      moduleApi.getAllModules(
        params.page,
        params.size,
        params.sort ?? "id,asc",
        trimmedKeyword ? trimmedKeyword : undefined
      ),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    isPlaceholderData: query.isPlaceholderData ?? false,
    refetch,
  };
}

export function useAdminModuleMutations(params: AdminModulesParams) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => adminModulesKey(params),
    [params.page, params.size, params.sort, params.keyword]
  );

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createModuleMutation = useMutation({
    mutationFn: (data: CreateModuleRequest) => moduleApi.createModule(data),
    onSuccess: invalidateList,
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateModuleRequest }) =>
      moduleApi.updateModule(id, data),
    onSuccess: invalidateList,
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: number) => moduleApi.deleteModule(id),
    onSuccess: invalidateList,
  });

  return {
    createModuleMutation,
    updateModuleMutation,
    deleteModuleMutation,
  };
}
