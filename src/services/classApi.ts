import { api } from "./api";
import type { ClassInfo } from "../types/class";
import type { PageResponse } from "../types/pagination";

export interface ClassMember {
  userId: number;
  role: string;
  joinDate: string;
}

export interface AddMemberRequest {
  userId: number;
  role: 'sinh_vien' | 'giao_vien';
}

export interface UpdateMemberRequest {
  role: 'sinh_vien' | 'giao_vien';
}

export interface CreateClassRequest {
  className: string;
  description?: string;
  programId?: number;
}

export interface UpdateClassRequest {
  className?: string;
  description?: string;
  programId?: number;
}

export interface ClassDTO {
  id?: number;
  className: string;
  description?: string;
  jobsEnabled?: boolean;
  members: Array<{
    userId: number;
    role: string;
    joinDate: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: string;
  }>;
  programId?: number;
  program?: {
    id: number;
    name: string;
    description?: string;
  };
}

export const getClassInfo = async (classId: number): Promise<ClassInfo> => {
  const response = await api.get<ClassDTO>(`/classes/${classId}`);
  return {
    id: classId,
    className: response.className,
    description: response.description || '',
    jobsEnabled: Boolean((response as any).jobsEnabled),
    members: (response.members || []).map((m, idx) => ({
      id: idx + 1,
      userId: m.userId,
      role: m.role,
      joinDate: typeof m.joinDate === 'string' ? m.joinDate : String(m.joinDate),
      user: (m.username || m.firstName || m.lastName) ? {
        id: m.userId,
        username: m.username || '',
        firstName: m.firstName || undefined,
        lastName: m.lastName || undefined,
        email: m.email || undefined,
        profileImage: m.profileImage || undefined
      } : undefined
    })),
    programId: (response as any).programId,
    program: response.program
  };
};

export const getAllClasses = async (page: number = 0, size: number = 10, sort?: string): Promise<PageResponse<ClassDTO>> => {
  const query: Record<string, string | number> = { page, size };
  if (sort) {
    query.sort = sort;
  }
  return api.get<PageResponse<ClassDTO>>('/classes', query);
};

export const getAllClassesAsArray = async (): Promise<ClassInfo[]> => {
  try {
    const response = await getAllClasses(0, 1000);
    return response.content.map((dto, index) => ({
      id: (dto as any).id || index + 1,
      className: dto.className,
      description: dto.description || '',
      jobsEnabled: Boolean((dto as any).jobsEnabled),
      members: (dto.members || []).map((m, idx) => ({
        id: idx + 1,
        userId: m.userId,
        role: m.role,
        joinDate: typeof m.joinDate === 'string' ? m.joinDate : String(m.joinDate),
        user: (m.username || m.firstName || m.lastName) ? {
          id: m.userId,
          username: m.username || '',
          firstName: m.firstName || undefined,
          lastName: m.lastName || undefined,
          email: m.email || undefined,
          profileImage: m.profileImage || undefined
        } : undefined
      })),
      programId: dto.programId,
      program: dto.program
    }));
  } catch (error) {
    console.error('Error fetching all classes:', error);
    return [];
  }
};

export const createClass = async (data: CreateClassRequest): Promise<ClassDTO> => {
  return api.post<ClassDTO>('/classes', data);
};

export const updateClass = async (classId: number, data: UpdateClassRequest): Promise<ClassDTO> => {
  return api.put<ClassDTO>(`/classes/${classId}`, data);
};

export const updateClassJobsSettings = async (classId: number, jobsEnabled: boolean): Promise<ClassDTO> => {
  return api.patch<ClassDTO>(`/classes/${classId}/jobs-settings`, { jobsEnabled });
};

export const updateClassProgram = async (classId: number, programId: number): Promise<ClassDTO> => {
  return api.put<ClassDTO>(`/classes/${classId}/program`, { programId });
};

export const deleteClass = async (classId: number): Promise<void> => {
  return api.delete<void>(`/classes/${classId}`);
};

export const addMemberToClass = async (classId: number, data: AddMemberRequest) => {
  return api.post(`/classes/${classId}/members`, data);
};

export const updateMemberRole = async (classId: number, userId: number, data: UpdateMemberRequest) => {
  return api.put(`/classes/${classId}/members/${userId}`, data);
};

export const removeMemberFromClass = async (classId: number, userId: number) => {
  return api.delete(`/classes/${classId}/members/${userId}`);
};

export const enrollToClass = async (classId: number) => {
  return api.post(`/classes/${classId}/enroll`);
};

export interface ClassModuleTeacherDTO {
  id: number;
  classModuleId: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  role: 'TEACHER';
  assignedAt: string;
}

export interface ClassModuleDTO {
  id: number;
  classId: number;
  className?: string;
  moduleId: number;
  moduleName?: string;
  scheduleType?: 'fixed' | 'flexible' | 'online' | 'offline';
  createdAt?: string;
  teachers?: ClassModuleTeacherDTO[];
}

export interface CreateClassModuleRequest {
  moduleId: number;
  scheduleType?: 'fixed' | 'flexible' | 'online' | 'offline';
}

export interface UpdateClassModuleRequest {
  scheduleType?: 'fixed' | 'flexible' | 'online' | 'offline';
}

export interface AssignTeacherRequest {
  userId: number;
  role: 'TEACHER';
}

export const getClassModules = async (classId: number): Promise<ClassModuleDTO[]> => {
  return api.get<ClassModuleDTO[]>(`/classes/${classId}/modules`);
};

export const createModulesFromProgram = async (classId: number): Promise<ClassModuleDTO[]> => {
  return api.post<ClassModuleDTO[]>(`/classes/${classId}/modules/from-program`);
};

export const getClassModule = async (classId: number, classModuleId: number): Promise<ClassModuleDTO> => {
  return api.get<ClassModuleDTO>(`/classes/${classId}/modules/${classModuleId}`);
};

export const createClassModule = async (classId: number, data: CreateClassModuleRequest): Promise<ClassModuleDTO> => {
  return api.post<ClassModuleDTO>(`/classes/${classId}/modules`, data);
};

export const updateClassModule = async (classId: number, classModuleId: number, data: UpdateClassModuleRequest): Promise<ClassModuleDTO> => {
  return api.put<ClassModuleDTO>(`/classes/${classId}/modules/${classModuleId}`, data);
};

export const deleteClassModule = async (classId: number, classModuleId: number): Promise<void> => {
  return api.delete<void>(`/classes/${classId}/modules/${classModuleId}`);
};

export const assignTeacherToClassModule = async (classId: number, classModuleId: number, data: AssignTeacherRequest): Promise<ClassModuleTeacherDTO> => {
  return api.post<ClassModuleTeacherDTO>(`/classes/${classId}/modules/${classModuleId}/teachers`, data);
};

export const getClassModuleTeachers = async (classId: number, classModuleId: number): Promise<ClassModuleTeacherDTO[]> => {
  return api.get<ClassModuleTeacherDTO[]>(`/classes/${classId}/modules/${classModuleId}/teachers`);
};

export const removeTeacherFromClassModule = async (classId: number, classModuleId: number, userId: number): Promise<void> => {
  return api.delete<void>(`/classes/${classId}/modules/${classModuleId}/teachers/${userId}`);
};

export const updateTeacherRole = async (classId: number, classModuleId: number, userId: number, role: 'TEACHER'): Promise<ClassModuleTeacherDTO> => {
  return api.put<ClassModuleTeacherDTO>(`/classes/${classId}/modules/${classModuleId}/teachers/${userId}/role`, { role });
};

export default {
  getClassInfo,
  getAllClasses,
  getAllClassesAsArray,
  createClass,
  updateClass,
  updateClassJobsSettings,
  updateClassProgram,
  deleteClass,
  addMemberToClass,
  updateMemberRole,
  removeMemberFromClass,
  enrollToClass,
  getClassModules,
  getClassModule,
  createClassModule,
  createModulesFromProgram,
  updateClassModule,
  deleteClassModule,
  assignTeacherToClassModule,
  getClassModuleTeachers,
  removeTeacherFromClassModule,
  updateTeacherRole
};