import { useCallback, useMemo, useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";

import TableSkeleton from "../../../components/TableSkeleton";
import StudentFormCreatePanel from "../../../components/forms/StudentFormCreatePanel";
import StudentFormDetailInline from "../../../components/forms/StudentFormDetailInline";
import { useClassStudentForms, useFormTemplates } from "../../../hooks/api/forms";
import { getUserById } from "../../../services/profileApi";
// import { parseBackendDate } from "../../../utils/timeFormat";
import { fetchStudentEnrollment, type StudentEnrollmentInfo } from "../../../utils/studentEnrollment";
import type { User } from "../../../services/userApi";
import type { ClassInfo, Member } from "../../../types/class";
import type { FormStatus, StudentFormResponse } from "../../../types/form";

type ClassFormsSectionProps = {
  classInfo: ClassInfo;
  numericClassId: number | null;
  onOpenMembersModal: () => void;
  showSuccess: (title: string, message: string) => void;
  showApiError: (error: unknown, message: string, title?: string) => void;
};

export default function ClassFormsSection({
  classInfo,
  numericClassId,
  onOpenMembersModal,
  showSuccess,
  showApiError,
}: ClassFormsSectionProps) {
  const queryClient = useQueryClient();
  const [studentsView, setStudentsView] = useState<
    "list" | "forms" | "create" | "formDetail"
  >("list");

  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [selectedStudentForForms, setSelectedStudentForForms] = useState<number | null>(null);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<User | null>(null);
  const [studentEnrollment, setStudentEnrollment] = useState<StudentEnrollmentInfo | null>(null);

  const currentClassId = classInfo?.id ?? numericClassId;

  const {
    data: studentForms = [],
    isFetching: loadingForms,
  } = useClassStudentForms(currentClassId, selectedStudentForForms, { sort: "id_desc" }, {
    enabled: studentsView === "forms" || studentsView === "formDetail",
  });

  const {
    data: formTemplates = [],
    isFetching: loadingTemplates,
    error: templatesError,
  } = useFormTemplates({ enabled: studentsView === "create" });

  const handleBackToStudentsList = useCallback(() => {
    setStudentsView("list");
    setSelectedStudentForForms(null);
    setSelectedStudentInfo(null);
    setSelectedFormId(null);
    setStudentEnrollment(null);
  }, []);

  const handleBackToFormsList = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["forms", "class", currentClassId],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "forms",
          "class",
          currentClassId,
          "student",
          selectedStudentForForms,
        ],
      }),
    ]);
    setStudentsView("forms");
    setSelectedFormId(null);
  }, [queryClient, currentClassId, selectedStudentForForms]);

  const loadStudentInfoAndEnrollment = useCallback(
    async (studentId: number) => {
      try {
        const userInfo = await getUserById(String(studentId));
        setSelectedStudentInfo({
          id: Number(userInfo.id),
          username: userInfo.username,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          profileImage: userInfo.profileImage,
          createdAt: userInfo.createdAt,
        });
      } catch (err) {
        console.error("Failed to load student info", err);
        showApiError(
          err,
          "Không thể tải thông tin học viên. Vui lòng thử lại.",
          "Lỗi tải thông tin"
        );
      }

      if (classInfo) {
        const programIdRaw =
          (classInfo as any)?.programId ?? classInfo.program?.id ?? undefined;
        const programId =
          programIdRaw !== undefined && programIdRaw !== null
            ? Number(programIdRaw)
            : undefined;
        const programName =
          classInfo.program?.name ?? (classInfo as any)?.programName ?? undefined;
        setStudentEnrollment({
          classId: classInfo.id,
          className: classInfo.className,
          programId,
          programName,
          classDetail: classInfo,
        });
        return;
      }

      try {
        const enrollment = await fetchStudentEnrollment(studentId);
        setStudentEnrollment(enrollment);
      } catch (err) {
        console.error("Failed to load enrollment info", err);
        showApiError(
          err,
          "Không thể tải thông tin ghi danh. Vui lòng thử lại.",
          "Lỗi tải ghi danh"
        );
        setStudentEnrollment(null);
      }
    },
    [classInfo, showApiError]
  );

  const handleViewStudentForms = useCallback(
    async (studentId: number) => {
      setSelectedStudentForForms(studentId);
      setStudentsView("forms");
      await loadStudentInfoAndEnrollment(studentId);
    },
    [loadStudentInfoAndEnrollment]
  );

  const handleCreateNewForm = useCallback(async () => {
    if (!selectedStudentForForms) return;

    if (classInfo && !studentEnrollment) {
      const programId =
        (classInfo as any)?.programId ?? classInfo.program?.id ?? undefined;
      const programName =
        classInfo.program?.name ?? (classInfo as any)?.programName ?? undefined;
      setStudentEnrollment({
        classId: classInfo.id,
        className: classInfo.className,
        programId,
        programName,
        classDetail: classInfo,
      });
    }

    setStudentsView("create");
  }, [classInfo, selectedStudentForForms, studentEnrollment]);

  const handleFormSuccess = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["forms", "class", currentClassId],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "forms",
          "class",
          currentClassId,
          "student",
          selectedStudentForForms,
        ],
      }),
    ]);
    setStudentsView("forms");
    showSuccess("Tạo đơn thành công", "Đơn của học viên đã được tạo.");
  }, [queryClient, currentClassId, selectedStudentForForms, showSuccess]);

  const totalForms = studentForms.length;

  const statusCounts = useMemo(() => {
    const by: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      APPROVED: 0,
    };
    studentForms.forEach((f) => {
      if (f.status && by[f.status] !== undefined) by[f.status] += 1;
    });
    return by;
  }, [studentForms]);

  const formatFormDate = (value?: string | number[] | null) => {
    if (!value) return "";
    try {
      // const parsed = parseBackendDate(value);
      const parsed = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value as string);
      if (!parsed) return "";
      return new Intl.DateTimeFormat("vi-VN").format(parsed);
    } catch {
      return String(value);
    }
  };

  const statusBadgeStyles: Record<FormStatus | "DEFAULT", string> = {
    APPROVED: "text-green-600",
    REJECTED: "text-red-600",
    PROCESSING: "text-teal-700",
    PENDING: "text-gray-800",
    DEFAULT: "text-gray-600",
  };

  const statusLabels: Record<FormStatus | "UNKNOWN", string> = {
    APPROVED: "ĐÃ DUYỆT",
    REJECTED: "TỪ CHỐI",
    PROCESSING: "ĐANG XỬ LÝ",
    PENDING: "CHỜ DUYỆT",
    UNKNOWN: "KHÔNG RÕ",
  };

  const renderMemberName = (member: Member) => {
    return (
      member.user?.username ||
      (member.user?.firstName && member.user?.lastName
        ? `${member.user.firstName} ${member.user.lastName}`
        : `User ${member.userId}`)
    );
  };

  const renderFormsTable = () => {
    if (loadingForms) {
      return <TableSkeleton rows={6} columns={7} />;
    }

    if (studentForms.length === 0) {
      return (
        <div className="py-12 text-center text-gray-500">
          Học viên này chưa có đơn nào
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Loại đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mã đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Học viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Lớp học
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Chương trình
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Ngày tạo đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-sm">
            {studentForms.map((form: StudentFormResponse) => {
              const status = form.status || "DEFAULT";
              const badgeStyle =
                statusBadgeStyles[status as keyof typeof statusBadgeStyles] ||
                statusBadgeStyles.DEFAULT;
              const statusLabel =
                statusLabels[status as keyof typeof statusLabels] ||
                statusLabels.UNKNOWN;

              return (
                <tr
                  key={form.id}
                  className="cursor-pointer transition-colors hover:bg-teal-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFormId(form.id);
                    setStudentsView("formDetail");
                  }}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {form.templateName}
                  </td>
                  <td className="px-6 py-4 text-gray-600">#{form.id}</td>
                  <td className="px-6 py-4 text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{form.studentName || "—"}</span>
                      <span className="text-xs text-gray-500">
                        Mã HV: {form.studentId ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{form.className || "—"}</td>
                  <td className="px-6 py-4 text-gray-700">{form.programName || "—"}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatFormDate(form.createdAt) || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${badgeStyle}`}>{statusLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {studentsView === "list" ? (
          <button
            onClick={onOpenMembersModal}
            className="rounded-lg bg-teal-600 px-4 py-2 text-white transition-colors hover:bg-teal-700"
          >
            Quản lý thành viên
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                if (studentsView === "create") {
                  handleBackToFormsList();
                } else if (studentsView === "formDetail") {
                  setStudentsView("forms");
                  setSelectedFormId(null);
                } else {
                  handleBackToStudentsList();
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Quay lại
            </button>
            {studentsView === "forms" && (
              <button
                onClick={handleCreateNewForm}
                className="rounded-lg bg-teal-600 px-4 py-2 text-white transition-colors hover:bg-teal-700"
              >
                Tạo đơn mới
              </button>
            )}
          </>
        )}
      </div>

      {studentsView === "list" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {classInfo.members && classInfo.members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Ngày tham gia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {classInfo.members.map((member: Member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {renderMemberName(member)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {member.user?.email || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {member.role === "giao_vien" ? "Giáo viên" : "Học viên"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {member.joinDate ? (Array.isArray(member.joinDate) ? new Date(member.joinDate[0], member.joinDate[1] - 1, member.joinDate[2]) : new Date(member.joinDate as string)).toLocaleString("vi-VN") : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {member.role === "giao_vien" ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleViewStudentForms(member.userId);
                            }}
                            className="rounded-md bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                          >
                            Danh sách đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">Chưa có thành viên nào trong lớp học này</div>
          )}
        </div>
      )}

      {studentsView === "forms" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedStudentInfo && (
            <div className="mb-4 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {`${selectedStudentInfo.firstName || ""} ${
                  selectedStudentInfo.lastName || ""
                }`.trim() || selectedStudentInfo.username}
              </h3>
              <p className="text-sm text-gray-500">{selectedStudentInfo.email}</p>
            </div>
          )}

          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalForms}</div>
              <div className="text-sm text-gray-600">Tổng đơn</div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{statusCounts.PENDING}</div>
              <div className="text-sm text-yellow-600">Chờ duyệt</div>
            </div>
            <div className="rounded-lg bg-teal-50 p-4 text-center">
              <div className="text-2xl font-bold text-teal-700">{statusCounts.PROCESSING}</div>
              <div className="text-sm text-teal-600">Đang xử lý</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{statusCounts.APPROVED}</div>
              <div className="text-sm text-green-600">Đã duyệt</div>
            </div>
          </div>

          {renderFormsTable()}
        </div>
      )}

      {studentsView === "create" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadingTemplates ? (
            <div className="py-12 text-center text-gray-500">Đang tải...</div>
          ) : templatesError ? (
            <div className="py-12 text-center text-gray-500">
              Không thể tải danh sách form mẫu
            </div>
          ) : selectedStudentInfo && formTemplates.length > 0 ? (
            <StudentFormCreatePanel
              templates={formTemplates}
              initialStudent={selectedStudentInfo}
              hideStudentSearch
              enrollmentInfo={studentEnrollment}
              onFormCancel={handleBackToFormsList}
              onFormSuccess={handleFormSuccess}
            />
          ) : (
            <div className="py-12 text-center text-gray-500">
              Không thể hiển thị form tạo đơn
            </div>
          )}
        </div>
      )}

      {studentsView === "formDetail" && selectedFormId && (
        <StudentFormDetailInline
          formId={selectedFormId}
          onBack={handleBackToFormsList}
        />
      )}
    </div>
  );
}
