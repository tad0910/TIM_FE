import { api } from "./api"; 
import type { PaginatedResult, Company } from "../types/company";

const COMPANY_ENDPOINT = "/api/admin/companies";

export const companyApi = {
  getAll: (page: number = 0, size: number = 10) => {
    return api.get<PaginatedResult<Company>>(COMPANY_ENDPOINT, {
      page,
      size,
    });
  },

  getById: (id: number) => {
    return api.get<Company>(`${COMPANY_ENDPOINT}/${id}`);
  },

  create: (data: FormData) => {
        return api.post(COMPANY_ENDPOINT, data, {
        });
    },

  update: (id: number, formData: FormData) => {
        return api.put(`${COMPANY_ENDPOINT}/${id}`, formData);
    },
      
  delete: (id: number) => {
    return api.delete(`${COMPANY_ENDPOINT}/${id}`);
  },
};