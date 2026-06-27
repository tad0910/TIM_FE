import { api } from './api';

export interface CouponDTO {
  id?: number;
  code: string;
  startDate: string; 
  endDate: string; 
  centerScope: string;
  discountValue: number;
  discountType: 'AMOUNT' | 'PERCENT';
  scenario: 'SPREAD_EVENLY' | 'DEDUCT_FIRST_FULL' | 'DEDUCT_LAST_FULL' | 'PARTIAL_FIRST_THEN_SPREAD';
  active: boolean;
  quantity?: number;
  usedCount?: number;
  description?: string;
}

export const couponApi = {
  getAll: async () => {
    return await api.get<CouponDTO[]>('/api/coupons');
  },

  create: async (coupon: CouponDTO) => {
    return await api.post<CouponDTO>('/api/coupons', coupon);
  },
};

