import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CouponDTO } from '../../services/couponApi';
import { couponApi } from '../../services/couponApi';
import { queryKeys } from './queryKeys';

export function useCouponsQuery() {
  return useQuery<CouponDTO[], Error>({
    queryKey: queryKeys.coupons.list(),
    queryFn: () => couponApi.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    select: (data) => data ?? [],
  });
}

export function useCreateCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CouponDTO) => couponApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.coupons.list() });
    },
  });
}
