import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  createPointType,
  deletePointType,
  getPointTypeById,
  getPointTypesPage,
  updatePointType,
  type CreatePointTypeRequest,
  type GamificationPointType,
  type PageResponse,
  type UpdatePointTypeRequest,
} from "../../services/gamificationApi";
import { getUserById } from "../../services/userApi";
import { queryKeys } from "./queryKeys";

export interface RewardPointTypeWithCreator extends GamificationPointType {
  creatorName?: string;
}

const creatorNameCache = new Map<number, string>();

const withCreatorName = async (
  pointType: GamificationPointType,
): Promise<RewardPointTypeWithCreator> => {
  const creatorId = pointType.createdBy;
  if (!creatorId) {
    return { ...pointType, creatorName: "-" };
  }

  const cachedName = creatorNameCache.get(creatorId);
  if (cachedName) {
    return { ...pointType, creatorName: cachedName };
  }

  try {
    const creator = await getUserById(creatorId);
    const fullName = creator.firstName && creator.lastName
      ? `${creator.firstName} ${creator.lastName}`
      : creator.username || `User ${creatorId}`;
    creatorNameCache.set(creatorId, fullName);
    return { ...pointType, creatorName: fullName };
  } catch {
    const fallback = `User ${creatorId}`;
    creatorNameCache.set(creatorId, fallback);
    return { ...pointType, creatorName: fallback };
  }
};

export interface RewardPointTypesListParams {
  page?: number;
  size?: number;
}

export function useRewardPointTypesList({
  page = 0,
  size = 10,
}: RewardPointTypesListParams) {
  const params = useMemo(() => ({ page, size }), [page, size]);

  return useQuery<PageResponse<RewardPointTypeWithCreator>>({
    queryKey: queryKeys.gamification.pointTypes.list(params),
    queryFn: async () => {
      const response = await getPointTypesPage(page, size);
      const content = response.content ?? [];
      const enriched = await Promise.all(content.map(withCreatorName));
      return { ...response, content: enriched };
    },
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });
}

export function useRewardPointTypeDetail(
  id: number | null,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && id != null;

  return useQuery<RewardPointTypeWithCreator | null>({
    queryKey: queryKeys.gamification.pointTypes.detail(id ?? 0),
    enabled,
    queryFn: async () => {
      if (id == null) return null;
      const detail = await getPointTypeById(id);
      return withCreatorName(detail);
    },
    staleTime: 60_000,
  });
}

type CreatePayload = {
  data: CreatePointTypeRequest;
  imageFile?: File | null;
};

type UpdatePayload = {
  id: number;
  data: UpdatePointTypeRequest;
  imageFile?: File | null;
};

type DeletePayload = {
  id: number;
};

export function useCreateRewardPointTypeMutation(
  options?: UseMutationOptions<
    GamificationPointType,
    unknown,
    CreatePayload
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationPointType, unknown, CreatePayload>({
    mutationFn: ({ data, imageFile }) => createPointType(data, imageFile || undefined),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.pointTypes.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateRewardPointTypeMutation(
  options?: UseMutationOptions<
    GamificationPointType,
    unknown,
    UpdatePayload
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<GamificationPointType, unknown, UpdatePayload>({
    mutationFn: ({ id, data, imageFile }) => updatePointType(id, data, imageFile || undefined),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.pointTypes.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteRewardPointTypeMutation(
  options?: UseMutationOptions<void, unknown, DeletePayload>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, DeletePayload>({
    mutationFn: ({ id }) => deletePointType(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.pointTypes.root() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
