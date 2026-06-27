import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  type CreateUserRequest,
  type UpdateUserRequest,
  type User,
} from "../services/userApi";
import type { PageResponse } from "../types/pagination";
import { queryKeys } from "./api/queryKeys";

export interface AdminUsersParams {
  page: number;
  size: number;
  sort?: string;
  keyword?: string;
}

const adminUsersKey = (params: AdminUsersParams) =>
  queryKeys.users.list({
    page: params.page,
    size: params.size,
    sort: params.sort ?? "id,asc",
    keyword: params.keyword ?? "",
  });

export function useAdminUsers(params: AdminUsersParams) {
  const queryKey = useMemo(
    () => adminUsersKey(params),
    [params.page, params.size, params.sort, params.keyword]
  );

  const query = useQuery<PageResponse<User>, Error>({
    queryKey,
    queryFn: () =>
      getAllUsers(
        params.page,
        params.size,
        params.sort ?? "id,asc"
      ),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return query;
}

export function useAdminUserMutations(params: AdminUsersParams) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => adminUsersKey(params),
    [params.page, params.size, params.sort, params.keyword]
  );

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: invalidateList,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      updateUser(id, data),
    onSuccess: invalidateList,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: invalidateList,
  });

  return {
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
  };
}
