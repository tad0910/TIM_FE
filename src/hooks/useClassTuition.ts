import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import TuitionAdminService, {
  type StudentPaymentScheduleDTO,
} from "../services/tuitionAdminService";
import type { Member } from "../types/class";

export interface ClassTuitionStudent {
  userId: number;
  name: string;
  email?: string;
  schedules: StudentPaymentScheduleDTO[];
}

interface UseClassTuitionResult {
  students: ClassTuitionStudent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export default function useClassTuition(
  classId: number | null,
  members: Member[] | undefined
): UseClassTuitionResult {
  const studentMembers = useMemo(() => {
    const list = (members ?? []).filter((m) => {
      const role = String(m.role || "").toLowerCase();
      const isTeacher = role.includes("giao_vien") || role.includes("teacher");
      return !isTeacher;
    });
    return list;
  }, [members]);

  const enabled = Boolean(classId) && studentMembers.length > 0;

  const studentSignature = useMemo(() => {
    return studentMembers
      .map((m) => Number(m.userId))
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => a - b)
      .join(",");
  }, [studentMembers]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ClassTuitionStudent[], unknown>({
    queryKey: ["classTuition", classId, studentSignature],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      if (!classId || studentMembers.length === 0) {
        return [];
      }

      const results = await Promise.all(
        studentMembers.map(async (member) => {
          const userId = Number(member.userId);
          const schedules =
            (await TuitionAdminService.getStudentSchedules(userId)) ?? [];

          const user = (member as any).user || {};
          const fullName =
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : (user.fullName || "").trim();
          const name =
            fullName ||
            user.username ||
            (member as any).name ||
            `HV ${userId}`;

          return {
            userId,
            name,
            email: user.email || user.userEmail || undefined,
            schedules,
          };
        })
      );

      return results;
    },
    select: (rows) => rows ?? [],
  });

  const queryErrorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Không thể tải dữ liệu học phí"
        : null;

  const safeRefetch = async () => {
    const result = await refetch({ throwOnError: false });
    if (result.error) {
      throw result.error;
    }
  };

  return {
    students: enabled ? data ?? [] : [],
    loading: enabled ? isLoading || isFetching : false,
    error: queryErrorMessage,
    refetch: safeRefetch,
  };
}
