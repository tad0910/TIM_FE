import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/NotificationPopup';
import TableSkeleton from '../../../components/TableSkeleton';
import { getGradeHistory, getMyGrades, type GradeHistoryDTO } from '../../../services/gradeApi';
import { formatDateTime, formatScore } from '../../../pages/admin/gradeUtils';
import { getClassModules, type ClassModuleDTO } from '../../../services/classApi';

export default function GradeHistoryPage() {
  const { user } = useAuthStore();
  const { notification, hideNotification, showApiError } = useNotification();
  const [historyData, setHistoryData] = useState<GradeHistoryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [userClasses, setUserClasses] = useState<Array<{ classId: number; className?: string }>>([]);
  const [classModules, setClassModules] = useState<ClassModuleDTO[]>([]);

  useEffect(() => {
    if (user?.id) {
      void fetchUserClasses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedClassId) {
      setSelectedModuleId(null);
      setClassModules([]);
      void fetchClassModules(selectedClassId);
    } else {
      setClassModules([]);
      setSelectedModuleId(null);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedModuleId && user?.id) {
      void fetchStudentGradeHistory(selectedModuleId);
    } else {
      setHistoryData([]);
    }
  }, [selectedModuleId, user?.id]);

  const fetchUserClasses = async () => {
    try {
      if (!user?.id) {
        throw new Error('Người dùng chưa đăng nhập');
      }

      const { api } = await import('../../../services/api');
      const response = await api.get<unknown>(`/users/${user.id}/classes`);
      
      const allClasses = Array.isArray(response)
        ? response.map((item: any) => ({
            classId: Number(item.classId ?? item.id ?? 0),
            className: item.className ?? '',
            role: String(item.role ?? '').toLowerCase(),
          }))
        : Array.isArray((response as any).classes)
        ? (response as any).classes.map((item: any) => ({
            classId: Number(item.classId ?? item.id ?? 0),
            className: item.className ?? '',
            role: String(item.role ?? '').toLowerCase(),
          }))
        : [];

      const studentClasses = allClasses.filter((cls: any) => {
        const role = cls.role || '';
        return !role.includes('giao_vien') && !role.includes('teacher') && !role.includes('admin');
      });

      setUserClasses(studentClasses);
      if (studentClasses.length > 0) {
        setSelectedClassId(studentClasses[0].classId);
      }
    } catch (error) {
      console.error('Error fetching user classes:', error);
      showApiError(error, 'Không thể tải danh sách lớp học', 'Lỗi tải lớp học');
    }
  };

  const fetchClassModules = async (classId: number) => {
    try {
      const modules = await getClassModules(classId);
      setClassModules(modules);
      setSelectedModuleId(modules[0]?.id ?? null);
    } catch (error) {
      console.error('Error fetching class modules:', error);
      showApiError(error, 'Không thể tải danh sách module', 'Lỗi tải module');
      setClassModules([]);
      setSelectedModuleId(null);
    }
  };

  const fetchStudentGradeHistory = async (classModuleId: number) => {
    try {
      setLoading(true);
      setHistoryData([]);
      
      let grades;
      try {
        grades = await getMyGrades(classModuleId);
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.status === 403) {
          console.warn('User is not a student in this class module');
          setHistoryData([]);
          return;
        }
        throw err;
      }
      
      if (!grades || grades.length === 0) {
        setHistoryData([]);
        return;
      }
      
      const allHistories: GradeHistoryDTO[] = [];
      
      for (const grade of grades) {
        if (grade.gradeId) {
          try {
            const histories = await getGradeHistory(grade.gradeId);
            allHistories.push(...histories);
          } catch (err: any) {
            console.error(`Error fetching history for grade ${grade.gradeId}:`, err);
          }
        }
      }
      
      allHistories.sort((a, b) => {
        const timeA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
        const timeB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
        return timeB - timeA;
      });
      
      setHistoryData(allHistories);
    } catch (error: any) {
      console.error('Error fetching grade history:', error);
      if (error?.response?.status !== 403 && error?.status !== 403) {
        showApiError(error, 'Không thể tải lịch sử điểm số', 'Lỗi tải lịch sử điểm');
      }
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <NotificationPopup notification={notification} onClose={hideNotification} />

        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử điểm số</h1>
          <p className="text-gray-600">
            Xem lịch sử thay đổi điểm số của bạn trong các module
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn lớp</label>
              <select
                value={selectedClassId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedClassId(value ? Number(value) : null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Chọn lớp</option>
                {userClasses.map((cls) => (
                  <option key={cls.classId} value={cls.classId}>
                    {cls.className || `Lớp ${cls.classId}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
              <select
                value={selectedModuleId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedModuleId(value ? Number(value) : null);
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
          </div>

          {!selectedModuleId ? (
            <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
              Chọn lớp và module để hiển thị lịch sử điểm số.
            </div>
          ) : loading ? (
            <TableSkeleton />
          ) : historyData.length === 0 ? (
            <div className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-lg">
              Chưa có lịch sử thay đổi điểm số cho module này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian thay đổi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm cũ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm mới
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm thay đổi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người thay đổi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.changedAt ? formatDateTime(history.changedAt) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.oldScore !== null && history.oldScore !== undefined
                          ? formatScore(history.oldScore)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.newScore !== null && history.newScore !== undefined
                          ? formatScore(history.newScore)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.componentChanged || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.changedByUserName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

