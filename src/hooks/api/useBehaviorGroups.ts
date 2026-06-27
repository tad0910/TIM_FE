import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  createBehavior,
  createBehaviorGroup,
  deleteBehavior,
  deleteBehaviorGroup,
  getAllBehaviorGroups,
  getBehaviorGroupsPage,
  updateBehavior,
  updateBehaviorGroup,
  type CreateBehaviorGroupRequest,
  type CreateBehaviorRequest,
  type GamificationBehavior,
  type GamificationBehaviorGroup,
  type UpdateBehaviorGroupRequest,
  type UpdateBehaviorRequest,
} from "../../services/gamificationApi";
import { queryKeys } from "./queryKeys";

export interface BehaviorGroupsListParams {
  page?: number;
  size?: number;
}

export function useBehaviorGroupsList({
  page = 0,
  size = 10,
}: BehaviorGroupsListParams) {
  const params = useMemo(() => ({ page, size }), [page, size]);

  return useQuery({
    queryKey: queryKeys.gamification.behaviorGroups.list(params),
    queryFn: () => getBehaviorGroupsPage(page, size),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });
}

export function useAllBehaviorGroups() {
  return useQuery({
    queryKey: queryKeys.gamification.behaviorGroups.all(),
    queryFn: () => getAllBehaviorGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

type CreateGroupPayload = CreateBehaviorGroupRequest;
type UpdateGroupPayload = { id: number; data: UpdateBehaviorGroupRequest };
type DeletePayload = { id: number };

type CreateBehaviorPayload = CreateBehaviorRequest;
type UpdateBehaviorPayload = { id: number; data: UpdateBehaviorRequest };

export function useCreateBehaviorGroupMutation(
  options?: UseMutationOptions<GamificationBehaviorGroup, unknown, CreateGroupPayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationBehaviorGroup, unknown, CreateGroupPayload>({
    mutationFn: (data) => createBehaviorGroup(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateBehaviorGroupMutation(
  options?: UseMutationOptions<GamificationBehaviorGroup, unknown, UpdateGroupPayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationBehaviorGroup, unknown, UpdateGroupPayload>({
    mutationFn: ({ id, data }) => updateBehaviorGroup(id, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteBehaviorGroupMutation(
  options?: UseMutationOptions<void, unknown, DeletePayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeletePayload>({
    mutationFn: ({ id }) => deleteBehaviorGroup(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useCreateBehaviorMutation(
  options?: UseMutationOptions<GamificationBehavior, unknown, CreateBehaviorPayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationBehavior, unknown, CreateBehaviorPayload>({
    mutationFn: (data) => createBehavior(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateBehaviorMutation(
  options?: UseMutationOptions<GamificationBehavior, unknown, UpdateBehaviorPayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationBehavior, unknown, UpdateBehaviorPayload>({
    mutationFn: ({ id, data }) => updateBehavior(id, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteBehaviorMutation(
  options?: UseMutationOptions<void, unknown, DeletePayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeletePayload>({
    mutationFn: ({ id }) => deleteBehavior(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.behaviorGroups.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
