import api from './api';

export interface InstallmentConfigDTO {
  installmentNumber: number;
  baseAmount: number;
  daysFromPrevious: number;
}

export interface TuitionRouteDTO {
  id?: number;
  programId?: number;
  name: string;
  type: string; 
  admissionFee?: number;
  firstMonthFee?: number;
  totalListedFee?: number;
  numberOfInstallments: number;
  frequency?: number; 
  description?: string;
  installmentConfigs?: InstallmentConfigDTO[];
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; 
  size: number;
  first: boolean;
  last: boolean;
}

export const tuitionRouteApi = {
  createRoute(dto: TuitionRouteDTO) {
    return api.post<TuitionRouteDTO>('/tuition-routes', dto);
  },

  list(page = 0, size = 50) {
    return api.get<Page<TuitionRouteDTO>>('/tuition-routes', { page, size });
  },

  getById(id: number) {
    return api.get<TuitionRouteDTO>(`/tuition-routes/${id}`);
  },

  updateRoute(id: number, dto: TuitionRouteDTO) {
    return api.put<TuitionRouteDTO>(`/tuition-routes/${id}`, dto);
  },

  async getAllTuitionRoutesAsArray(maxPages = 50): Promise<TuitionRouteDTO[]> {
    const results: TuitionRouteDTO[] = [];
    let page = 0;
    for (let i = 0; i < maxPages; i++) {
      const resp = await this.list(page, 100);
      results.push(...(resp.content || []));
      if (resp.last || resp.number + 1 >= resp.totalPages) break;
      page = resp.number + 1;
    }
    return results;
  },
};

export default tuitionRouteApi;
