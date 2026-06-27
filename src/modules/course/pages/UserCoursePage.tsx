import React, { useState, useEffect, useCallback, type JSX } from "react";
import { programApi } from "../../../services/programApi";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../store/useAuthStore";
import type { Program } from "../../../types/program";
import ProgramModal from "../components/ProgramModal";

const UserCoursePage: React.FC = (): JSX.Element => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const { user } = useAuthStore();

  const fetchUserPrograms = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const userId = user?.id || localStorage.getItem("userId");
      if (!userId) {
        console.error("User not authenticated");
        setPrograms([]);
        return;
      }

      let userClassesResponse;
      try {
        userClassesResponse = await api.get(`/users/${userId}/classes`);
      } catch (error) {
        console.error("User has no classes or error fetching classes:", error);
        setPrograms([]);
        return;
      }

      let userClasses: Array<{
        classId: number;
        className?: string;
        programId?: number;
        role?: string;
        joinDate?: string;
      }> = [];

      if (Array.isArray(userClassesResponse)) {
        userClasses = userClassesResponse;
      } else if (
        userClassesResponse &&
        typeof userClassesResponse === "object"
      ) {
        const response = userClassesResponse as Record<string, unknown>;
        if (response.classes && Array.isArray(response.classes)) {
          userClasses = response.classes;
        } else if (response.data && Array.isArray(response.data)) {
          userClasses = response.data;
        }
      }

      if (userClasses.length === 0) {
        setPrograms([]);
        return;
      }

      const programIds = new Set<number>();
      const programClassMap = new Map<number, number[]>();

      for (const userClass of userClasses) {
        if (userClass.programId) {
          programIds.add(userClass.programId);
          const existing = programClassMap.get(userClass.programId) ?? [];
          programClassMap.set(userClass.programId, [
            ...existing,
            userClass.classId,
          ]);
        } else {
          try {
            const classInfo = (await api.get(
              `/classes/${userClass.classId}`
            )) as { programId?: number };
            if (classInfo && classInfo.programId) {
              programIds.add(classInfo.programId);
              const existing = programClassMap.get(classInfo.programId) ?? [];
              programClassMap.set(classInfo.programId, [
                ...existing,
                userClass.classId,
              ]);
            }
          } catch (error) {
            console.warn(
              `Failed to get class info for classId ${userClass.classId}:`,
              error
            );
          }
        }
      }

      if (programIds.size === 0) {
        setPrograms([]);
        return;
      }

      try {
        const allProgramsResponse = await programApi.getAllPrograms(0, 100);
        const userPrograms = allProgramsResponse.content.filter((program) =>
          programIds.has(program.id)
        );
        setPrograms(userPrograms);
      } catch (error) {
        console.warn("Failed to fetch programs:", error);
        setPrograms([]);
      }
    } catch (error) {
      console.warn("Error loading user programs:", error);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchUserPrograms();
  }, [fetchUserPrograms]);

  const handleOpenModal = (program: Program): void => {
    setSelectedProgram(program);
  };

  const handleCloseModal = (): void => {
    setSelectedProgram(null);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F2F4F7" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">
            Đang tải danh sách chương trình...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: "#F2F4F7" }}
    >
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Chương trình học của tôi
          </h1>
          <p className="text-gray-600 mt-2">
            Danh sách các khóa học bạn đang tham gia
          </p>
        </header>

        {programs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Bạn chưa có khóa học nào
              </h3>
              <p className="text-gray-500 mb-6">
                Bạn chưa tham gia lớp học nào. Hãy liên hệ với quản trị viên để
                được thêm vào lớp học.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => {
              return (
                <div
                  key={program.id}
                  className="bg-white rounded-lg shadow-sm p-5 border hover:shadow-md transition cursor-pointer"
                  onClick={() => handleOpenModal(program)}
                >
                  <h2 className="text-lg font-semibold text-gray-800">
                    {program.name}
                  </h2>
                  {program.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {program.description}
                    </p>
                  )}
                  {/* Tiến độ học đã được ẩn theo yêu cầu, chỉ giữ lại thông tin học phần */}
                  <p className="text-indigo-600 text-sm mt-3 font-medium">
                    {program.modules?.length ?? 0} học phần
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {selectedProgram && (
          <ProgramModal program={selectedProgram} onClose={handleCloseModal} />
        )}
      </div>
    </div>
  );
};

export default UserCoursePage;
