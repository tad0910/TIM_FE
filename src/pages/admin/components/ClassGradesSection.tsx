import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import TableSkeleton from "../../../components/TableSkeleton";
import Pagination from "../../../components/Pagination";
import GradeEntryModal from "../../../components/GradeEntryModal";
import { useGradeMutations, useModuleGradebook, useModuleGradeHistory } from "../../../hooks/api/grades";
import type { ClassInfo } from "../../../types/class";
import type { BatchGradeUpdateRequest, GradebookStudentRow } from "../../../services/gradeApi";
// import { parseBackendDate } from "../../../utils/timeFormat";
import { formatDate, formatDateTime, formatScore, resolveComponentColumns } from "../gradeUtils";
import { componentNameToField, todayString } from "../gradeEntryHelpers";

type GradeTab = "list" | "entry" | "history";

type ClassGradesSectionProps = {
  classId: number | null;
  classInfo: ClassInfo;
  modules: Array<{
    id: number;
    moduleId: number;
    moduleName?: string;
    createdAt?: string;
    teachers?: Array<{ userName?: string; userEmail?: string; assignedAt?: string }>;
  }>;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showApiError: (error: unknown, message: string, title?: string) => void;
};

export default function ClassGradesSection({
  classId,
  classInfo,
  modules,
  showSuccess,
  showWarning,
  showApiError,
}: ClassGradesSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [gradeTab, setGradeTab] = useState<GradeTab>("list");

  const [selectedEntryModuleId, setSelectedEntryModuleId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState<string>(() => todayString());
  const [entryCurrentPage, setEntryCurrentPage] = useState(0);
  const pageSize = 20;

  const [selectedHistoryModuleId, setSelectedHistoryModuleId] = useState<number | null>(null);

  const [gradeModal, setGradeModal] = useState<{
    isOpen: boolean;
    studentId: number | null;
    studentName: string;
    currentTheoryScore?: number | string | null;
    currentPracticeScore?: number | string | null;
    entryDate?: string | null;
  }>({
    isOpen: false,
    studentId: null,
    studentName: "",
    entryDate: todayString(),
  });

  const entryDateParam = entryDate?.trim();
  const entryQueryOptions = entryDateParam
    ? ({ entryDate: entryDateParam } as const)
    : ({ missingEntryDateOnly: true } as const);

  useEffect(() => {
    if (modules.length === 0) {
      setSelectedEntryModuleId(null);
      setSelectedHistoryModuleId(null);
      return;
    }

    setSelectedEntryModuleId((prev) => prev ?? modules[0].id);
    setSelectedHistoryModuleId((prev) => prev ?? modules[0].id);
  }, [modules]);

  useEffect(() => {
    setEntryCurrentPage(0);
  }, [entryDate]);

  const {
    data: entryGradebook,
    isFetching: entryLoading,
    error: entryError,
  } = useModuleGradebook(
    gradeTab === "entry" ? selectedEntryModuleId : null,
    entryCurrentPage,
    pageSize,
    entryQueryOptions,
    {
      enabled: gradeTab === "entry",
    }
  );

  useEffect(() => {
    if (!entryError) return;
    showApiError(entryError, "Không thể tải dữ liệu nhập điểm", "Lỗi tải dữ liệu nhập điểm");
  }, [entryError, showApiError]);

  const {
    data: historyData = [],
    isFetching: historyLoading,
    error: historyError,
  } = useModuleGradeHistory(
    gradeTab === "history" ? selectedHistoryModuleId : null,
    {
      enabled: gradeTab === "history",
    }
  );

  useEffect(() => {
    if (!historyError) return;
    showApiError(historyError, "Không thể tải lịch sử điểm số", "Lỗi tải lịch sử điểm số");
  }, [historyError, showApiError]);

  const { saveGradesMutation } = useGradeMutations();

  const { columns: componentColumns, usingFallback: usingFallbackColumns } = useMemo(
    () => resolveComponentColumns(entryGradebook?.components),
    [entryGradebook?.components]
  );

  type ModuleSummary = {
    id: number;
    moduleName: string;
    className?: string;
    createdAt?: string;
    enteredBy: string;
    enteredAt?: string;
  };

  const moduleSummaries: ModuleSummary[] = useMemo(() => {
    return modules.map((module) => {
      const teacher = module.teachers?.[0];
      return {
        id: module.id,
        moduleName: module.moduleName || `Module ${module.moduleId}`,
        className: classInfo?.className || "",
        createdAt: module.createdAt,
        enteredBy: teacher?.userName || teacher?.userEmail || "Chưa xác định",
        enteredAt: teacher?.assignedAt,
      };
    });
  }, [modules, classInfo]);

  const filteredEntryStudents = useMemo(() => {
    if (!entryGradebook) return [];
    return entryGradebook.students;
  }, [entryGradebook]);

  const formatEntryDateValue = (value?: string | number[] | null) => {
    if (!value) return null;
    // const parsed = parseBackendDate(value);
    const parsed = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value as string);
    if (!parsed || isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("vi-VN");
  };

  const formatSelectedEntryDateLabel = () => {
    if (!entryDate) return "Tất cả ngày";
    const formatted = formatEntryDateValue(entryDate);
    if (formatted) return formatted;
    return entryDate;
  };

  const normalizeDateForInput = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  };

  const deriveEntryDateForStudent = (student?: GradebookStudentRow | null) => {
    if (!student) return null;
    const candidates = [
      student.theoryScoreEntryDate,
      student.practiceScoreEntryDate,
      student.entryDate,
      student.theoryScoreLastUpdatedAt,
      student.practiceScoreLastUpdatedAt,
      student.lastUpdatedAt,
    ];

    for (const value of candidates) {
      const normalized = normalizeDateForInput(value);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  };

  const handleViewModuleDetail = (summary: ModuleSummary) => {
    const detailPath = `/admin/grades/${summary.id}${classId ? `?classId=${classId}` : ""}`;
    navigate(detailPath, {
      state: { summary, from: `${location.pathname}${location.search}` },
    });
  };

  const handleSaveGrade = async (data: {
    studentId: number | null;
    theoryScore: number | null;
    practiceScore: number | null;
    entryDate?: string | null;
  }) => {
    if (!selectedEntryModuleId || !data.studentId) {
      showWarning("Thiếu thông tin", "Vui lòng chọn học viên trước khi lưu điểm.");
      return;
    }

    const effectiveEntryDate = data.entryDate || entryDate;

    if (!effectiveEntryDate) {
      showWarning("Thiếu ngày nhập điểm", "Vui lòng chọn ngày trước khi lưu điểm.");
      return;
    }

    const payload: BatchGradeUpdateRequest = {
      classModuleId: selectedEntryModuleId,
      entryDate: effectiveEntryDate,
      scores: [
        {
          studentId: data.studentId,
          components: {
            "Điểm lý thuyết": data.theoryScore,
            "Điểm thực hành": data.practiceScore,
          },
        },
      ],
    };

    try {
      await saveGradesMutation.mutateAsync(payload);
      showSuccess("Đã lưu điểm số", "Điểm số đã được lưu thành công.");
      setGradeModal({
        isOpen: false,
        studentId: null,
        studentName: "",
        entryDate: effectiveEntryDate,
      });

      if (entryDate !== effectiveEntryDate) {
        setEntryDate(effectiveEntryDate);
      }
    } catch (error) {
      showApiError(error, "Không thể lưu điểm số, vui lòng thử lại.", "Lỗi lưu điểm số");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Trang thao tác</span>
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              gradeTab === "list"
                ? "bg-white shadow text-teal-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setGradeTab("list")}
          >
            Danh sách điểm
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              gradeTab === "entry"
                ? "bg-white shadow text-teal-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setGradeTab("entry")}
          >
            Trang nhập điểm
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              gradeTab === "history"
                ? "bg-white shadow text-teal-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setGradeTab("history")}
          >
            Lịch sử điểm
          </button>
        </div>
      </div>

      {gradeTab === "list" && (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Bảng dưới đây chỉ hiển thị thông tin tổng quan. Nhấn &quot;Xem chi tiết&quot; để mở
            trang mới với bảng điểm đầy đủ của module tương ứng.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Lớp học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Giáo viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Lần cập nhật
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {moduleSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-slate-500">
                      Chưa có module nào trong lớp này.
                    </td>
                  </tr>
                ) : (
                  moduleSummaries.map((summary) => (
                    <tr key={summary.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatDate(summary.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{summary.moduleName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {summary.className || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {summary.enteredBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {summary.enteredAt ? formatDateTime(summary.enteredAt) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleViewModuleDetail(summary)}
                          className="text-teal-700 hover:text-teal-900 font-medium text-sm"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gradeTab === "entry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Module</label>
              <select
                value={selectedEntryModuleId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedEntryModuleId(value ? Number(value) : null);
                }}
                disabled={modules.length === 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              >
                <option value="">Chọn module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.moduleName || `Module ${module.moduleId}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ngày nhập điểm</label>
              <input
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="dd/mm/yyyy"
              />
              <p className="text-xs text-slate-500 mt-1">
                Để trống để xem tất cả học viên chưa có ngày nhập điểm.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!entryGradebook || entryGradebook.students.length === 0) {
                    showWarning("Không có học viên", "Vui lòng chọn module có học viên.");
                    return;
                  }
                  setGradeModal({
                    isOpen: true,
                    studentId: null,
                    studentName: "",
                    entryDate: entryDate || todayString(),
                  });
                }}
                disabled={!selectedEntryModuleId || entryLoading || !entryGradebook}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
                  !selectedEntryModuleId || entryLoading || !entryGradebook
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                + Thêm điểm mới
              </button>
            </div>
          </div>

          {!selectedEntryModuleId ? (
            <div className="text-center text-slate-500 py-10 border border-dashed border-slate-300 rounded-lg">
              Chọn ít nhất một module để hiển thị bảng nhập điểm.
            </div>
          ) : entryLoading ? (
            <TableSkeleton />
          ) : entryGradebook && filteredEntryStudents.length > 0 ? (
            <>
              <div className="space-y-3">
                {usingFallbackColumns && (
                  <div className="px-4 py-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                    Module này chưa có cấu hình thành phần điểm. Tạm hiển thị "Điểm lý thuyết" và
                    "Điểm thực hành" để bạn nhập nhanh.
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                          Tên học viên
                        </th>
                        {componentColumns.map((component) => (
                          <th
                            key={component}
                            className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]"
                          >
                            {component}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">
                          Ngày nhập điểm
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[100px]">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredEntryStudents.map((student) => {
                        const theoryField = componentNameToField("Điểm lý thuyết");
                        const practiceField = componentNameToField("Điểm thực hành");
                        const theoryScore = theoryField ? student[theoryField] : undefined;
                        const practiceScore = practiceField ? student[practiceField] : undefined;

                        return (
                          <tr key={student.studentId} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                              <div className="text-sm font-medium text-slate-900">
                                {student.studentName}
                              </div>
                            </td>
                            {componentColumns.map((component) => {
                              const field = componentNameToField(component);
                              const score = field ? student[field] : undefined;
                              return (
                                <td key={component} className="px-6 py-4 text-center">
                                  <span className="text-sm text-slate-900">
                                    {score !== undefined && score !== null
                                      ? formatScore(score as number | string)
                                      : "-"}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-slate-900">
                                {formatEntryDateValue(student.entryDate) ?? "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setGradeModal({
                                    isOpen: true,
                                    studentId: student.studentId,
                                    studentName: student.studentName,
                                    currentTheoryScore: theoryScore,
                                    currentPracticeScore: practiceScore,
                                    entryDate:
                                      deriveEntryDateForStudent(student) ||
                                      entryDate ||
                                      todayString(),
                                  });
                                }}
                                disabled={saveGradesMutation.isPending}
                                className="px-3 py-1 text-sm font-medium text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-md disabled:opacity-50"
                              >
                                Sửa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {entryGradebook.totalPages > 1 && (
                <div className="border-t pt-4">
                  <Pagination
                    currentPage={entryCurrentPage}
                    totalPages={entryGradebook.totalPages}
                    totalElements={entryGradebook.totalElements}
                    pageSize={pageSize}
                    onPageChange={setEntryCurrentPage}
                    itemName="học viên"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-500 py-6 border border-dashed border-slate-300 rounded-lg">
              Không có bản ghi điểm nào cho ngày {formatSelectedEntryDateLabel()}.
            </div>
          )}
        </div>
      )}

      {gradeTab === "history" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Module</label>
              <select
                value={selectedHistoryModuleId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedHistoryModuleId(value ? Number(value) : null);
                }}
                disabled={modules.length === 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              >
                <option value="">Chọn module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.moduleName || `Module ${module.moduleId}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedHistoryModuleId ? (
            <div className="text-center text-slate-500 py-10 border border-dashed border-slate-300 rounded-lg">
              Chọn ít nhất một module để hiển thị lịch sử điểm số.
            </div>
          ) : historyLoading ? (
            <TableSkeleton />
          ) : historyData.length === 0 ? (
            <div className="text-center text-slate-500 py-6 border border-dashed border-slate-300 rounded-lg">
              Chưa có lịch sử thay đổi điểm số cho module này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Thời gian thay đổi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Tên học viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Điểm cũ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Điểm mới
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Điểm thay đổi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Người thay đổi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {historyData.map((history) => (
                    <tr key={history.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.changedAt ? formatDateTime(history.changedAt) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.studentDisplayName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.oldScore !== null && history.oldScore !== undefined
                          ? formatScore(history.oldScore)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.newScore !== null && history.newScore !== undefined
                          ? formatScore(history.newScore)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.componentChanged || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {history.changedByUserName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <GradeEntryModal
        isOpen={gradeModal.isOpen}
        onClose={() =>
          setGradeModal({
            isOpen: false,
            studentId: null,
            studentName: "",
            entryDate: entryDate || todayString(),
          })
        }
        onSave={handleSaveGrade}
        studentId={gradeModal.studentId}
        studentName={gradeModal.studentName || "Chọn học viên"}
        students={
          entryGradebook?.students.map((s) => ({
            studentId: s.studentId,
            studentName: s.studentName,
          })) || []
        }
        currentTheoryScore={gradeModal.currentTheoryScore}
        currentPracticeScore={gradeModal.currentPracticeScore}
        isSaving={saveGradesMutation.isPending}
        initialEntryDate={gradeModal.entryDate || entryDate || todayString()}
        notify={{ showWarning }}
      />
    </div>
  );
}
