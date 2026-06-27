import { api } from "./api";

export interface AttendanceMarkDto {
  studentId: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  notes?: string;
}

export interface MarkAttendanceRequest {
  teacherId: number;
  records: AttendanceMarkDto[];
}

export interface AttendanceSession {
  id: number;
  scheduleId: number;
  openedAt: string;
  closedAt?: string;
  isLate: boolean;
  openedBy: number;
}

export interface AttendanceRecord {
  id: number;
  scheduleId: number;
  studentId: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  markedBy: number;
  markedAt: string;
  notes?: string;
}

export interface AttendanceStatsDto {
  studentId: number;
  studentName: string;
  attendedCount: number;
  totalSessions: number;
  attendanceRate: number | null;
}

export interface AttendanceHistoryDto {
  scheduleId: number;
  moduleName: string;
  sessionNumber: number;
  sessionTitle: string;
  sessionDatetime: string;
  openedAt: string | null;
  closedAt: string | null;
  isLate: boolean | null;
  openedByName: string | null;
  markedByName: string | null;
}

export interface AttendanceDetailDto {
  studentId: number;
  studentName: string;
  status: string;
  markedAt: string | null;
  notes: string | null;
  markedBy: number | null;
}

export const openAttendanceSession = async (
  scheduleId: number,
  teacherId: number
): Promise<AttendanceSession> => {
  return api.post<AttendanceSession>(
    `/attendance/schedules/${scheduleId}/open`,
    { teacherId }
  );
};

export const markAttendance = async (
  scheduleId: number,
  request: MarkAttendanceRequest
): Promise<AttendanceRecord[]> => {
  return api.post<AttendanceRecord[]>(
    `/attendance/schedules/${scheduleId}/mark`,
    request
  );
};

export const getAttendanceRecords = async (
  scheduleId: number
): Promise<AttendanceRecord[]> => {
  return api.get<AttendanceRecord[]>(
    `/attendance/schedules/${scheduleId}/records`
  );
};

export const getAttendanceStats = async (
  classId: number
): Promise<AttendanceStatsDto[]> => {
  return api.get<AttendanceStatsDto[]>(
    `/attendance/stats/${classId}`
  );
};

export const getAttendanceHistory = async (
  classId: number
): Promise<AttendanceHistoryDto[]> => {
  return api.get<AttendanceHistoryDto[]>(
    `/attendance/history/${classId}`
  );
};

export const getAttendanceDetails = async (
  scheduleId: number
): Promise<AttendanceDetailDto[]> => {
  return api.get<AttendanceDetailDto[]>(
    `/attendance/schedules/${scheduleId}/details`
  );
};

export default {
  openAttendanceSession,
  markAttendance,
  getAttendanceRecords,
  getAttendanceStats,
  getAttendanceHistory,
  getAttendanceDetails,
};

