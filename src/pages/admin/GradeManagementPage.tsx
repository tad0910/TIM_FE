import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  batchCreateOrUpdateGrades,
  getModuleGradebook,
  type BatchGradeUpdateRequest,
  type GradebookDTO,
} from '../../services/gradeApi';
import {
  getAllClassesAsArray,
  getClassModules,
  type ClassModuleDTO,
} from '../../services/classApi';
import type { ClassInfo } from '../../types/class';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import Pagination from '../../components/Pagination';
import { useNotification } from '../../hooks/useNotification';
import { useAuthStore } from '../../store/useAuthStore';
import { DEFAULT_GRADE_COMPONENTS, formatDate, formatDateTime, formatScore, resolveComponentColumns } from './gradeUtils';
import { componentNameToField, parseScoreValue, todayString } from './gradeEntryHelpers';

type TabKey = 'list' | 'entry';
export default function GradeManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const classIdParam = searchParams.get('classId');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classModules, setClassModules] = useState<ClassModuleDTO[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('list');

  const [selectedEntryModuleId, setSelectedEntryModuleId] = useState<number | null>(null);
  const [entryGradebook, setEntryGradebook] = useState<GradebookDTO | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryCurrentPage, setEntryCurrentPage] = useState(0);
  const [entryDate, setEntryDate] = useState<string>(() => todayString());
  const [editingGrade, setEditingGrade] = useState<{
    studentId: number;
    componentName: string;
    currentScore: number;
  } | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [pageSize] = useState(20);
  const [generatingSampleData, setGeneratingSampleData] = useState(false);
  const { user } = useAuthStore();
  const editorDisplayName = user?.username || user?.email || 'bạn';

  const { columns: entryComponentColumns, usingFallback: usingFallbackEntryColumns } = useMemo(() => {
    return resolveComponentColumns(entryGradebook?.components);
  }, [entryGradebook?.components]);

  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();
  const hasFetchedClassesRef = useRef(false);

  useEffect(() => {
    if (hasFetchedClassesRef.current) return;
    hasFetchedClassesRef.current = true;
    void fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    if (!classIdParam) return;
    const parsedId = Number(classIdParam);
    if (Number.isNaN(parsedId)) return;
    const exists = classes.some((cls) => cls.id === parsedId);
    if (!exists) return;
    setSelectedClassId((prev) => (prev === parsedId ? prev : parsedId));
  }, [classes, classIdParam]);

  useEffect(() => {
    if (selectedClassId) {
      void fetchClassModules(selectedClassId);
    } else {
      setClassModules([]);
      setSelectedEntryModuleId(null);
      setEntryGradebook(null);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedEntryModuleId) {
      void fetchEntryGradebook(selectedEntryModuleId, entryCurrentPage, pageSize);
    } else {
      setEntryGradebook(null);
    }
  }, [selectedEntryModuleId, entryCurrentPage, pageSize]);

  useEffect(() => {
    setEntryCurrentPage(0);
    setEditingGrade(null);
    setEntryDate(todayString());
  }, [selectedEntryModuleId]);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const classesData = await getAllClassesAsArray();
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      showApiError(error, 'Không thể tải danh sách lớp học', 'Lỗi tải danh sách lớp');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassModules = async (classId: number) => {
    try {
      const modules = await getClassModules(classId);
      setClassModules(modules);
      if (modules.length > 0) {
        setSelectedEntryModuleId((prev) => prev ?? modules[0].id);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      showApiError(error, 'Không thể tải danh sách module', 'Lỗi tải module');
    }
  };

  const fetchEntryGradebook = async (classModuleId: number, page: number, size: number) => {
    try {
      setEntryLoading(true);
      const data = await getModuleGradebook(classModuleId, page, size);
      setEntryGradebook(data);
    } catch (error) {
      console.error('Error fetching entry gradebook:', error);
      showApiError(error, 'Không thể tải dữ liệu nhập điểm', 'Lỗi tải dữ liệu nhập điểm');
    } finally {
      setEntryLoading(false);
    }
  };

  const submitScoreChange = async (studentId: number, componentName: string, newScore: number) => {
    if (!selectedEntryModuleId) return;
    if (!entryDate) {
      showWarning('Thiếu ngày nhập điểm', 'Vui lòng chọn ngày nhập điểm trước khi lưu.');
      return;
    }

    const payload: BatchGradeUpdateRequest = {
      classModuleId: selectedEntryModuleId,
      entryDate,
      scores: [
        {
          studentId,
          components: {
            [componentName]: Number.isNaN(newScore) ? null : newScore,
          },
        },
      ],
    };

    try {
      setIsSavingScore(true);
      await batchCreateOrUpdateGrades(payload);
      showSuccess('Đã lưu điểm số thành công');
      setEditingGrade(null);
      await fetchEntryGradebook(selectedEntryModuleId, entryCurrentPage, pageSize);
    } catch (error) {
      console.error('Error saving grade:', error);
      showApiError(error, 'Không thể lưu điểm số', 'Lỗi lưu điểm số');
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleViewModuleDetail = (summary: ModuleSummary) => {
    const detailPath = `/admin/grades/${summary.id}${selectedClassId ? `?classId=${selectedClassId}` : ''}`;
    navigate(detailPath, { state: { summary, from: `${location.pathname}${location.search}` } });
  };

  const handleGenerateSampleData = async () => {
    if (!selectedEntryModuleId || !entryGradebook) {
      showWarning('Không thể tạo dữ liệu', 'Vui lòng chọn module và đợi dữ liệu tải xong.');
      return;
    }
    if (!entryDate) {
      showWarning('Thiếu ngày nhập điểm', 'Vui lòng chọn ngày trước khi tạo dữ liệu.');
      return;
    }

    const components =
      entryGradebook.components && entryGradebook.components.length > 0
        ? entryGradebook.components.map((name) => ({ name, maxScore: 10 }))
        : DEFAULT_GRADE_COMPONENTS;

    const scoresPayload: BatchGradeUpdateRequest['scores'] = [];

    for (const student of entryGradebook.students) {
      const componentsForStudent: Record<string, number> = {};

      components.forEach((component) => {
        const field = componentNameToField(component.name);
        const currentScore = field ? student[field] : undefined;
        if (currentScore === null || currentScore === undefined) {
          const randomScore = Math.round((6 + Math.random() * 4) * 10) / 10;
          componentsForStudent[component.name] = randomScore;
        }
      });

      if (Object.keys(componentsForStudent).length > 0) {
        scoresPayload.push({
          studentId: student.studentId,
          components: componentsForStudent,
        });
      }
    }

    if (scoresPayload.length === 0) {
      showWarning('Không có dữ liệu mới', 'Tất cả học viên đã có điểm cho các thành phần hiện có.');
      return;
    }

    setGeneratingSampleData(true);
    try {
      await batchCreateOrUpdateGrades({
        classModuleId: selectedEntryModuleId,
        entryDate,
        scores: scoresPayload,
      });
      showSuccess('Đã tạo dữ liệu điểm mẫu cho module');
      await fetchEntryGradebook(selectedEntryModuleId, entryCurrentPage, pageSize);
    } catch (error) {
      console.error('Error generating sample grade data:', error);
      showApiError(error, 'Không thể tạo dữ liệu mẫu, vui lòng thử lại.', 'Lỗi tạo dữ liệu mẫu');
    } finally {
      setGeneratingSampleData(false);
    }
  };

  const classNameMap = useMemo(() => {
    const map = new Map<number, string>();
    classes.forEach((cls) => map.set(cls.id, cls.className));
    return map;
  }, [classes]);

  type ModuleSummary = {
    id: number;
    moduleName: string;
    className?: string;
    createdAt?: string;
    enteredBy: string;
    enteredAt?: string;
  };

  const moduleSummaries: ModuleSummary[] = useMemo(() => {
    return classModules.map((module) => {
      const teacher = module.teachers?.[0];
      return {
        id: module.id,
        moduleName: module.moduleName || `Module ${module.moduleId}`,
        className: module.className || classNameMap.get(module.classId) || '',
        createdAt: module.createdAt,
        enteredBy: teacher?.userName || teacher?.userEmail || 'Chưa xác định',
        enteredAt: teacher?.assignedAt,
      };
    });
  }, [classModules, classNameMap]);

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationPopup notification={notification} onClose={hideNotification} />

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý điểm số</h1>
            <p className="text-gray-600 mt-1">
              Theo dõi danh sách điểm và nhập mới cho các module của lớp học.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn lớp học</label>
            <select
              value={selectedClassId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedClassId(value ? Number(value) : null);
                setSelectedEntryModuleId(null);
                setEntryCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value=""> Chọn lớp </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Trang thao tác</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'list'
                    ? 'bg-white shadow text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('list')}
              >
                Danh sách điểm
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'entry'
                    ? 'bg-white shadow text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('entry')}
              >
                Trang nhập điểm
              </button>
            </div>
          </div>
        </div>
      </div>

      {!selectedClassId ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Hãy chọn một lớp để bắt đầu
          </h3>
          <p className="text-gray-600">
            Trang danh sách và nhập điểm sẽ hiển thị sau khi bạn chọn lớp học tương ứng.
          </p>
        </div>
      ) : activeTab === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Bảng dưới đây chỉ hiển thị thông tin tổng quan. Nhấn &quot;Xem chi tiết&quot; để mở trang mới với
            bảng điểm đầy đủ của module tương ứng.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lớp học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giáo viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lần cập nhật
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {moduleSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      Chưa có module nào trong lớp này.
                    </td>
                  </tr>
                ) : (
                  moduleSummaries.map((summary) => (
                    <tr key={summary.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(summary.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{summary.moduleName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.className || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.enteredBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.enteredAt ? formatDateTime(summary.enteredAt) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleViewModuleDetail(summary)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
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
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
            <select
                value={selectedEntryModuleId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedEntryModuleId(value ? Number(value) : null);
                }}
                disabled={classModules.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
                <option value="">Chọn module</option>
              {classModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.moduleName || `Module ${module.moduleId}`}
                </option>
              ))}
            </select>
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày nhập điểm</label>
              <input
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-600">
              Dùng nút &quot;Tạo dữ liệu mẫu&quot; để sinh nhanh điểm lý thuyết/thực hành cho toàn bộ học viên.
            </p>
            <button
              type="button"
              onClick={handleGenerateSampleData}
              disabled={!selectedEntryModuleId || generatingSampleData || entryLoading || !entryGradebook}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
                !selectedEntryModuleId || generatingSampleData || entryLoading || !entryGradebook
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {generatingSampleData ? 'Đang tạo dữ liệu...' : 'Tạo dữ liệu mẫu'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Mọi thao tác chỉnh sửa/nhập mới sẽ tự động ghi nhận người chỉnh sửa là{' '}
            <span className="font-semibold text-gray-700">{editorDisplayName}</span>.
          </p>

          {!selectedEntryModuleId ? (
            <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
              Chọn ít nhất một module để hiển thị bảng nhập điểm.
            </div>
          ) : entryLoading ? (
            <TableSkeleton />
          ) : entryGradebook && entryGradebook.students.length > 0 ? (
            <>
              <div className="space-y-3">
                {usingFallbackEntryColumns && (
                  <div className="px-4 py-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                    Module này chưa có cấu hình thành phần điểm. Tạm hiển thị &quot;Điểm lý thuyết&quot; và &quot;Điểm
                    thực hành&quot; để bạn nhập nhanh.
                  </div>
                )}
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Tên học viên
                      </th>
                      {entryComponentColumns.map((component) => (
                        <th
                          key={component}
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                        >
                          {component}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entryGradebook.students.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                          <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                        </td>
                        {entryComponentColumns.map((component) => {
                          const field = componentNameToField(component);
                          const score = field ? student[field] : undefined;
                          return (
                            <td key={component} className="px-6 py-4 text-center">
                              {editingGrade?.studentId === student.studentId &&
                              editingGrade?.componentName === component ? (
                                  <input
                                    type="number"
                                  min="0"
                                    step="0.1"
                                  defaultValue={editingGrade.currentScore}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                  disabled={isSavingScore}
                                  autoFocus
                                  onBlur={() => setEditingGrade(null)}
                                  onKeyDown={async (event) => {
                                    if (event.key === 'Enter') {
                                      const newScore = parseFloat((event.target as HTMLInputElement).value) || 0;
                                      await submitScoreChange(student.studentId, component, newScore);
                                    }
                                    if (event.key === 'Escape') {
                                        setEditingGrade(null);
                                      }
                                    }}
                                  />
                              ) : (
                                <button
                                  onClick={() => {
                                    const numericScore = parseScoreValue(score) ?? 0;
                                    setEditingGrade({
                                      studentId: student.studentId,
                                      componentName: component,
                                      currentScore: numericScore,
                                    });
                                  }}
                                  disabled={isSavingScore}
                                  className="text-sm text-gray-900 hover:text-indigo-600 hover:underline"
                                >
                                  {score !== undefined && score !== null ? formatScore(score as number | string) : '-'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
            <div className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-lg">
              Không có học viên nào để hiển thị.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

