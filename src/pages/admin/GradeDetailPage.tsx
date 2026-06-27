import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TableSkeleton from '../../components/TableSkeleton';
import { getModuleGradebook, type GradebookDTO } from '../../services/gradeApi';
import { formatDate, formatDateTime, formatScore, resolveComponentColumns } from './gradeUtils';
import { componentNameToField } from './gradeEntryHelpers';
import { useAdminHeader } from '../../components/admin/layout/AdminShell';

interface ModuleSummaryState {
  id: number;
  moduleName: string;
  className?: string;
  createdAt?: string;
  enteredBy?: string;
  enteredAt?: string;
}

export default function GradeDetailPage() {
  const navigate = useNavigate();
  const { classModuleId } = useParams();
  const [searchParams] = useSearchParams();
  const classIdFromQuery = searchParams.get('classId');
  const location = useLocation();
  const state = location.state as { summary?: ModuleSummaryState; from?: string } | undefined;
  const summaryFromState = state?.summary;
  const fromPath = state?.from;
  const RETURN_PATH_KEY = 'gradeDetailReturnPath';
  const [persistedFromPath, setPersistedFromPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(RETURN_PATH_KEY);
  });

  const [gradebook, setGradebook] = useState<GradebookDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedModuleIdRef = useRef<number | null>(null);
  const { updateHeader, resetHeader } = useAdminHeader();

  useEffect(() => {
    if (state?.from) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(RETURN_PATH_KEY, state.from);
      }
      setPersistedFromPath(state.from);
    }
  }, [state?.from]);

  useEffect(() => {
    if (!classModuleId) return;
    const numericId = Number(classModuleId);
    if (Number.isNaN(numericId)) return;
    if (fetchedModuleIdRef.current === numericId) return;
    fetchedModuleIdRef.current = numericId;

    const fetchGradebook = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getModuleGradebook(numericId, 0, 100);
        setGradebook(data);
      } catch (err) {
        console.error('Error loading grade detail', err);
        setError('Không thể tải bảng điểm chi tiết.');
      } finally {
        setLoading(false);
      }
    };

    void fetchGradebook();
  }, [classModuleId]);

  const handleBack = () => {
    const targetPath = fromPath ?? persistedFromPath;
    if (targetPath) {
      navigate(targetPath);
      return;
    }
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    if (classIdFromQuery) {
      navigate(`/admin/classes/${classIdFromQuery}`);
    } else {
      navigate('/admin/classes');
    }
  };

  const detailHeader = useMemo(() => {
    return {
      moduleName: gradebook?.moduleName ?? summaryFromState?.moduleName ?? 'Chi tiết bảng điểm',
      className: gradebook?.className ?? summaryFromState?.className ?? '—',
      createdAt: gradebook?.students.length ? summaryFromState?.createdAt : summaryFromState?.createdAt,
      enteredBy: summaryFromState?.enteredBy ?? 'Chưa xác định',
      enteredAt: summaryFromState?.enteredAt,
    };
  }, [gradebook, summaryFromState]);

  useEffect(() => {
    const crumbs: { label: string; href?: string }[] = [
      { label: 'Admin', href: '/admin/dashboard' },
      { label: 'Lớp học', href: '/admin/classes' },
    ];
    crumbs.push({
      label: detailHeader.className,
      href: classIdFromQuery ? `/admin/classes/${classIdFromQuery}` : '/admin/classes',
    });
    crumbs.push({
      label: detailHeader.moduleName,
      href:
        classIdFromQuery && classModuleId
          ? `/admin/classes/${classIdFromQuery}/modules/${classModuleId}`
          : undefined,
    });
    updateHeader({
      title: detailHeader.moduleName,
      breadcrumbs: crumbs,
    });
    return () => resetHeader();
  }, [classIdFromQuery, detailHeader.className, detailHeader.moduleName, resetHeader, updateHeader]);

  const { columns: componentColumns, usingFallback: usingFallbackComponents } = useMemo(() => {
    return resolveComponentColumns(gradebook?.components);
  }, [gradebook?.components]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <span aria-hidden="true">←</span>
          Quay lại danh sách
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500 uppercase">Module</p>
          <h1 className="text-2xl font-bold text-gray-900">{detailHeader.moduleName}</h1>
          <p className="text-gray-600">{detailHeader.className}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-center text-red-600 py-10">{error}</div>
        ) : gradebook ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase">Ngày tạo</p>
                <p className="text-base font-medium text-gray-900">
                  {summaryFromState?.createdAt ? formatDate(summaryFromState.createdAt) : '—'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase">Giáo viên</p>
                <p className="text-base font-medium text-gray-900">{detailHeader.enteredBy}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase">Ngày nhập</p>
                <p className="text-base font-medium text-gray-900">
                  {detailHeader.enteredAt ? formatDateTime(detailHeader.enteredAt) : '—'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase">Số học viên</p>
                <p className="text-base font-medium text-gray-900">{gradebook.totalElements}</p>
              </div>
            </div>

            <div className="space-y-3">
              {usingFallbackComponents && (
                <div className="px-4 py-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                  Module này chưa được cấu hình thành phần điểm. Tạm thời hiển thị cột &quot;Điểm lý thuyết&quot; và
                  &quot;Điểm thực hành&quot; để bạn có thể nhập nhanh.
                </div>
              )}
              <div className="overflow-x-auto">
                {gradebook.students.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">Chưa có học viên nào trong module này.</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tên học viên
                        </th>
                        {componentColumns.map((component) => (
                          <th
                            key={component}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {component}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {gradebook.students.map((student) => (
                        <tr key={student.studentId}>
                          <td className="px-6 py-4 text-sm text-gray-900">{student.studentName}</td>
                          {componentColumns.map((component) => {
                            const field = componentNameToField(component);
                            const score = field ? student[field] : undefined;
                            return (
                              <td key={component} className="px-6 py-4 text-sm text-gray-900">
                                {formatScore(score as number | string | undefined)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-10">Không tìm thấy dữ liệu bảng điểm.</div>
        )}
      </div>
    </div>
  );
}


