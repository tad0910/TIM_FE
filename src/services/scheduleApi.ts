import { api } from "./api";

export interface ClassModuleScheduleDTO {
  id: number;
  classId: number;
  className?: string;
  moduleId: number;
  moduleName?: string;
  instructorId?: number;
  instructorName?: string;
  startDate: string;
  endDate: string;
  status: string;
  classModuleId?: number;
  moduleSessionId?: number;
}

export interface CreateScheduleRequest {
  classId: number;
  moduleId: number;
  instructorId?: number;
  startDate: string;
  endDate: string;
  classModuleId?: number;
  moduleSessionId?: number;
}

export interface ClassModuleScheduleTeacherDTO {
  id: number;
  classModuleScheduleId: number;
  userId: number;
  userName?: string;
  role: "LECTURER" | "SUPPORTER" | "OBSERVER";
  assignedAt?: string;
}

export interface AssignTeacherRequest {
  userId: number;
  role: "LECTURER" | "SUPPORTER" | "OBSERVER";
}

export const getSchedulesByClass = async (
  classId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ClassModuleScheduleDTO[]> => {
  let url = `/schedules/class/${classId}`;
  const params: string[] = [];
  
  if (startDate) {
    params.push(`startDate=${startDate.toISOString().split('T')[0]}`);
  }
  if (endDate) {
    params.push(`endDate=${endDate.toISOString().split('T')[0]}`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return api.get<ClassModuleScheduleDTO[]>(url);
};

export const getSchedulesByInstructor = async (
  instructorId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ClassModuleScheduleDTO[]> => {
  let url = `/schedules/instructor/${instructorId}`;
  const params: string[] = [];
  
  if (startDate) {
    params.push(`startDate=${startDate.toISOString().split('T')[0]}`);
  }
  if (endDate) {
    params.push(`endDate=${endDate.toISOString().split('T')[0]}`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return api.get<ClassModuleScheduleDTO[]>(url);
};

export const getAllSchedulesByTeacher = async (
  teacherId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ClassModuleScheduleDTO[]> => {
  let url = `/schedules/teacher/${teacherId}/all`;
  const params: string[] = [];
  
  if (startDate) {
    params.push(`startDate=${startDate.toISOString().split('T')[0]}`);
  }
  if (endDate) {
    params.push(`endDate=${endDate.toISOString().split('T')[0]}`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return api.get<ClassModuleScheduleDTO[]>(url);
};

export const createSchedule = async (
  data: CreateScheduleRequest
): Promise<ClassModuleScheduleDTO> => {
  return api.post<ClassModuleScheduleDTO>("/schedules", data);
};

export const getScheduleTeachers = async (
  scheduleId: number
): Promise<ClassModuleScheduleTeacherDTO[]> => {
  return api.get<ClassModuleScheduleTeacherDTO[]>(`/schedules/${scheduleId}/teachers`);
};

export const assignTeacherToSchedule = async (
  scheduleId: number,
  data: AssignTeacherRequest
): Promise<ClassModuleScheduleTeacherDTO> => {
  return api.post<ClassModuleScheduleTeacherDTO>(`/schedules/${scheduleId}/teachers`, data);
};

export const removeTeacherFromSchedule = async (
  scheduleId: number,
  userId: number
): Promise<void> => {
  return api.delete(`/schedules/${scheduleId}/teachers/${userId}`);
};

export const updateScheduleTeacherRole = async (
  scheduleId: number,
  userId: number,
  role: "LECTURER" | "SUPPORTER" | "OBSERVER"
): Promise<ClassModuleScheduleTeacherDTO> => {
  return api.put<ClassModuleScheduleTeacherDTO>(
    `/schedules/${scheduleId}/teachers/${userId}/role`,
    { role }
  );
};

export const updateSchedule = async (
  scheduleId: number,
  data: Partial<CreateScheduleRequest>
): Promise<ClassModuleScheduleDTO> => {
  return api.put<ClassModuleScheduleDTO>(`/schedules/${scheduleId}`, data);
};

export const deleteSchedule = async (scheduleId: number): Promise<void> => {
  return api.delete(`/schedules/${scheduleId}`);
};

export default {
  getSchedulesByClass,
  getSchedulesByInstructor,
  getAllSchedulesByTeacher,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleTeachers,
  assignTeacherToSchedule,
  removeTeacherFromSchedule,
  updateScheduleTeacherRole,
};

