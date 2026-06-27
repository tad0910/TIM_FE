import { api } from "../services/api";
import { getClassInfo } from "../services/classApi";
import type { ClassInfo } from "../types/class";

interface UserClassRef {
  classId: number;
  role?: string;
  className?: string;
}

const normalizeUserClasses = (payload: unknown, fallbackUserId?: number): UserClassRef[] => {
  if (Array.isArray(payload)) {
    return payload.map((item: any) => ({
      classId: Number(item.classId ?? item.id ?? 0),
      role: String(item.role ?? ""),
      className: item.className ?? "",
    }));
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as any).classes)) {
    return (payload as any).classes.map((item: any) => ({
      classId: Number(item.classId ?? item.id ?? 0),
      role: String(item.role ?? ""),
      className: item.className ?? "",
    }));
  }

  console.warn("[studentEnrollment] Unexpected payload shape for user classes", {
    payload,
    fallbackUserId,
  });
  return [];
};

const isStudentRole = (role?: string) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes("sinh_vien") ||
    normalized.includes("hoc_vien") ||
    normalized.includes("student")
  );
};

export interface StudentEnrollmentInfo {
  classId: number;
  className?: string;
  programId?: number;
  programName?: string;
  classDetail?: ClassInfo;
}

export const fetchStudentEnrollment = async (
  studentId: number
): Promise<StudentEnrollmentInfo | null> => {
  try {
    const userClassesResponse = await api.get<unknown>(`/users/${studentId}/classes`);
    const classes = normalizeUserClasses(userClassesResponse, studentId).filter(
      (cls) => cls.classId > 0
    );

    if (!classes.length) {
      return null;
    }

    const prioritized =
      classes.find((cls) => isStudentRole(cls.role)) ?? classes[0];

    if (!prioritized?.classId) {
      return null;
    }

    try {
      const classInfo = await getClassInfo(prioritized.classId);
      return {
        classId: classInfo.id,
        className: classInfo.className || prioritized.className,
        programId: classInfo.programId ?? classInfo.program?.id,
        programName: classInfo.program?.name,
        classDetail: classInfo,
      };
    } catch (error) {
      console.error("[studentEnrollment] Failed to load class detail", error);
      return {
        classId: prioritized.classId,
        className: prioritized.className,
      };
    }
  } catch (error) {
    console.error("[studentEnrollment] Failed to load user classes", error);
    return null;
  }
};


