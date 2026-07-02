import React, { useState, useEffect, useCallback, type JSX } from "react";
import { programApi } from "../../../services/programApi";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../store/useAuthStore";
import type { Program } from "../../../types/program";
import ProgramModal from "../components/ProgramModal";
import PageLayout from "../../../components/layout/PageLayout";

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
    <PageLayout
      title="Chương trình học của tôi"
      description="Danh sách các khóa học bạn đang tham gia tại CodeGym"
      headerGradient="from-indigo-600 via-purple-600 to-indigo-800"
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      }
    >

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
          <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
            {programs.map((program, index) => {
              // Generate slightly different gradients based on index for variety
              const gradients = [
                "from-blue-500 to-indigo-600",
                "from-emerald-400 to-teal-600",
                "from-orange-400 to-rose-500",
                "from-purple-500 to-fuchsia-600",
              ];
              const bgGradient = gradients[index % gradients.length];

              return (
                <div
                  key={program.id}
                  className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col h-full"
                  onClick={() => handleOpenModal(program)}
                >
                  <div className={`h-24 w-full bg-gradient-to-r ${bgGradient} relative overflow-hidden`}>
                     <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-10 rounded-full mix-blend-overlay"></div>
                  </div>
                  
                  <div className="px-6 pb-6 pt-4 flex-1 flex flex-col relative">
                    <div className="absolute -top-10 right-6 w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-800 pr-16 line-clamp-2 leading-tight">
                      {program.name}
                    </h2>
                    
                    {program.description && (
                      <p className="text-gray-500 text-sm mt-3 line-clamp-3 flex-1">
                        {program.description}
                      </p>
                    )}
                    
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                        {program.modules?.length ?? 0} HỌC PHẦN
                      </div>
                      <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-medium">
                        Chi tiết <span className="ml-1">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedProgram && (
          <ProgramModal program={selectedProgram} onClose={handleCloseModal} />
        )}
    </PageLayout>
  );
};

export default UserCoursePage;
