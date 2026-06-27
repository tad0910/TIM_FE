import { api } from "./api";
import type { PageResponse } from "../types/pagination";

export interface SessionDetailDTO {
  id: number;
  title: string;
  content?: string;
  moduleId: number;
  sessionNumber?: number;
  scheduledAt?: string;
  endDate?: string;
  status?: string;
}

export type CreateSessionRequest = {
  title: string;
  content?: string;
  sessionNumber?: number;
  scheduledAt?: string;
};

export type UpdateSessionRequest = {
  title?: string;
  content?: string;
  sessionNumber?: number;
  scheduledAt?: string;
};

export async function getSessionById(sessionId: number|string): Promise<SessionDetailDTO> {
  return api.get<SessionDetailDTO>(`/modules/sessions/${sessionId}`);
}

export async function getSessionsByModule(moduleId: number|string, page: number = 0, size: number = 10, sort?: string | string[]): Promise<PageResponse<SessionDetailDTO>> {
  const query: Record<string, any> = { page, size };
  if (sort) {
    if (Array.isArray(sort)) query.sort = sort as any;
    else query.sort = sort;
  }
  const result = await api.get<any>(`/modules/${moduleId}/sessions`, query);
  if (Array.isArray(result)) {
    const content = result as SessionDetailDTO[];
    return {
      content,
      number: 0,
      size,
      totalElements: content.length,
      totalPages: 1,
      first: true,
      last: true,
      empty: content.length === 0,
    } as PageResponse<SessionDetailDTO>;
  }
  if (result && typeof result === 'object' && 'content' in result) {
    return result as PageResponse<SessionDetailDTO>;
  }
  return {
    content: [],
    number: 0,
    size,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
  } as PageResponse<SessionDetailDTO>;
}

export async function getSessionsByModulePaged(moduleId: number|string, page: number = 0, size: number = 10, sort?: string | string[]): Promise<PageResponse<SessionDetailDTO>> {
  return getSessionsByModule(moduleId, page, size, sort);
}

export async function createSession(
  moduleId: number | string,
  data: CreateSessionRequest
): Promise<SessionDetailDTO> {
  return api.post<SessionDetailDTO>(`/modules/${moduleId}/sessions`, data);
}

export async function updateSession(
  sessionId: number | string,
  data: UpdateSessionRequest
): Promise<SessionDetailDTO> {
  return api.put<SessionDetailDTO>(`/modules/sessions/${sessionId}`, data);
}

export async function deleteSession(sessionId: number | string): Promise<void> {
  await api.delete<void>(`/modules/sessions/${sessionId}`);
}

export interface ModuleDTO {
  id: number;
  name: string;
  description?: string;
  sessions?: SessionDetailDTO[];
}

export interface ProgramDTO {
  id: number;
  name: string;
  description?: string;
  modules: ModuleDTO[];
}

export async function getProgramById(programId: number|string): Promise<ProgramDTO> {
  return api.get<ProgramDTO>(`/programs/${programId}`);
}
