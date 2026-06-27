import { api } from "./api";
import type { Program } from "../types/program";
import type { PageResponse } from "../types/pagination";

export const programApi = {
  getAllPrograms: (page: number = 0, size: number = 10, sort?: string | string[]) => {
    const query: Record<string, string | number> = { page, size };
    if (sort) {
      query.sort = Array.isArray(sort) ? sort.join(",") : sort;
    }
    return api.get<PageResponse<Program>>("/programs", query);
  },
  
  getAllProgramsAsArray: async (): Promise<Program[]> => {
    const response = await api.get<PageResponse<Program>>("/programs", { page: 0, size: 1000 });
    return response.content;
  },

  getProgramById: (id: number) => api.get<Program>(`/programs/${id}`),

  createProgram: (data: Omit<Program, "id">) =>
    api.post<Program>("/programs", data),

  updateProgram: (id: number, data: Omit<Program, "id">) =>
    api.put<Program>(`/programs/${id}`, data),

  addModulesToProgram: async (programId: number, moduleIds: number[]) => {
    const result = await api.put<Program>(`/programs/${programId}/modules`, moduleIds);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("program-modules-updated", {
          detail: { programId },
        })
      );
    }
    return result;
  },

  deleteProgram: (id: number) => api.delete<void>(`/programs/${id}`),
};
