import { api } from "./api";
import type { Module } from "../types/module";
import type { Session } from "../types/session";
import type { PageResponse } from "../types/pagination";

export interface CreateModuleRequest {
  name: string;
  description?: string;
  position?: number;
}

export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  position?: number;
}

export interface CreateModuleSessionRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateModuleSessionRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export const moduleApi = {
  getAllModules: (
    page: number = 0,
    size: number = 10,
    sort?: string | string[],
    keyword?: string
  ) => {
    const query: Record<string, string | number | boolean | null | undefined> = {
      page,
      size,
    };
    if (sort) {
      query.sort = Array.isArray(sort) ? sort.join(",") : sort;
    }
    if (keyword) {
      query.keyword = keyword;
    }
    return api.get<PageResponse<Module>>("/module", query);
  },
  
  getAllModulesAsArray: async (): Promise<Module[]> => {
    const response = await api.get<PageResponse<Module>>("/module", { page: 0, size: 1000 });
    return response.content;
  },

  getModuleByIdStrict: (id: number) => api.get<Module>(`/module/${id}`),

  searchModules: async (
    query?: Record<string, string | number | boolean | undefined | null>
  ): Promise<Module[]> => {
    const response = await api.get<PageResponse<Module> | Module[]>(
      "/module/search",
      query
    );

    if (Array.isArray(response)) return response;
    if (response && typeof response === "object" && "content" in response) {
      return (response as PageResponse<Module>).content ?? [];
    }
    return [];
  },

  getModuleById: async (id: number) => {
    const module = await api.get<Module>(`/module/${id}`);
    if (!module || typeof module.id !== "number") {
      throw new Error("Module not found");
    }
    return module;
  },

  createModule: (data: CreateModuleRequest) =>
    api.post<Module>("/module", data),

  updateModule: (id: number, data: UpdateModuleRequest) =>
    api.put<Module>(`/module/${id}`, data),

  deleteModule: (id: number) => api.delete(`/module/${id}`),

  getSessionsByModule: (moduleId: number) =>
    api.get<Session[]>(`/modules/${moduleId}/sessions`),

  getSessionById: (sessionId: number) =>
    api.get<Session>(`/modules/sessions/${sessionId}`),

  createSession: (moduleId: number, data: CreateModuleSessionRequest) =>
    api.post<Session>(`/modules/${moduleId}/sessions`, data),

  updateSession: (sessionId: number, data: UpdateModuleSessionRequest) =>
    api.put<Session>(`/modules/sessions/${sessionId}`, data),

  addSessionsToModule: (moduleId: number, sessionIds: number[]) =>
    api.put<Module>(`/modules/${moduleId}/sessions`, sessionIds),

  deleteSession: (sessionId: number) =>
    api.delete<{ message: string; sessionId: number }>(
      `/modules/sessions/${sessionId}`
    ),
};
