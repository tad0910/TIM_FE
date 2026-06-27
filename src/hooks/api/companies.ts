import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { companyApi } from '../../services/companyApi';
import type { Company, PaginatedResult } from '../../types/company';
import { queryKeys } from './queryKeys';

export interface CompanyListParams {
  page: number;
  size: number;
}

const companiesListKey = (params: CompanyListParams) =>
  queryKeys.companies.list({
    page: params.page,
    size: params.size,
  });

export function useCompaniesQuery(params: CompanyListParams) {
  return useQuery<PaginatedResult<Company>, Error>({
    queryKey: companiesListKey(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: () => companyApi.getAll(params.page, params.size),
  });
}

export function useCompanyDetailQuery(companyId: number | null) {
  return useQuery<Company, Error>({
    queryKey: queryKeys.companies.detail(companyId),
    enabled: companyId != null,
    staleTime: 60_000,
    queryFn: () => {
      if (companyId == null) {
        throw new Error('Missing company id');
      }
      return companyApi.getById(companyId);
    },
  });
}

export function useCompanyMutations(params: CompanyListParams) {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: companiesListKey(params) });
  };

  const createMutation = useMutation({
    mutationFn: (payload: FormData) => companyApi.create(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FormData }) =>
      companyApi.update(id, payload),
    onSuccess: async (_, variables) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => companyApi.delete(id),
    onSuccess: async (_, id) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(id),
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
