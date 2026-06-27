import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { getAllClassesAsArray } from '../../services/classApi';
import { getSchedulesByClass, type ClassModuleScheduleDTO } from '../../services/scheduleApi';
import {
  getAttendanceStats,
  getAttendanceHistory,
  getAttendanceDetails,
  getAttendanceRecords,
  type AttendanceStatsDto,
  type AttendanceHistoryDto,
  type AttendanceDetailDto,
  type AttendanceRecord,
} from '../../services/attendanceApi';
// import { parseBackendDate } from '../../utils/timeFormat';
import AdminPageHeader from '../../components/AdminPageHeader';
import AttendancePageSkeleton from '../../components/AttendancePageSkeleton';

export default function AdminAttendanceManagementPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<ClassModuleScheduleDTO[]>([]);
  const [stats, setStats] = useState<AttendanceStatsDto[]>([]);
  const [history, setHistory] = useState<AttendanceHistoryDto[]>([]);
  const [details, setDetails] = useState<Record<number, AttendanceDetailDto[]>>({});
  const [records, setRecords] = useState<Record<number, AttendanceRecord[]>>({});
  const [expandedSchedules, setExpandedSchedules] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const cls = await getAllClassesAsArray();
        setClasses(cls.map(c => ({ id: c.id, name: (c as any).className || `Lớp ${c.id}` })));
        setLoading(false);
      } catch (err) {
        console.error('Failed to load classes', err);
        setClasses([]);
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const loadForClass = async () => {
      if (!selectedClassId) return;
      setLoading(true);
      try {
        setLoadingSchedules(true);
        const sch = await getSchedulesByClass(selectedClassId);
        setSchedules(Array.isArray(sch) ? sch : []);
      } catch (err) {
        console.error('Failed to load schedules for class', err);
        setSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }

      try {
        setLoadingStats(true);
        const s = await getAttendanceStats(selectedClassId);
        setStats(Array.isArray(s) ? s : []);
      } catch (err) {
        console.error('Failed to load attendance stats', err);
        setStats([]);
      } finally {
        setLoadingStats(false);
      }

      try {
        setLoadingHistory(true);
        const h = await getAttendanceHistory(selectedClassId);
        setHistory(Array.isArray(h) ? h : []);
      } catch (err) {
        console.error('Failed to load attendance history', err);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }

      setLoading(false);
    };

    loadForClass();
  }, [selectedClassId]);

  const loadDetails = async (scheduleId: number) => {
    if (details[scheduleId]) return;
    try {
      const d = await getAttendanceDetails(scheduleId);
      setDetails(prev => ({ ...prev, [scheduleId]: d }));
    } catch (err) {
      console.error('Failed to load attendance details', err);
      setDetails(prev => ({ ...prev, [scheduleId]: [] }));
    }
  };

  const loadRecords = async (scheduleId: number) => {
    if (records[scheduleId]) return;
    try {
      const r = await getAttendanceRecords(scheduleId);
      setRecords(prev => ({ ...prev, [scheduleId]: r }));
    } catch (err) {
      console.error('Failed to load attendance records', err);
      setRecords(prev => ({ ...prev, [scheduleId]: [] }));
    }
  };

  const getClassName = (classId: number) => {
    return classes.find(c => c.id === classId)?.name || `Lớp ${classId}`;
  };

  const selectedClassName = selectedClassId ? getClassName(selectedClassId) : '';

  const toggleScheduleExpand = (scheduleId: number) => {
    const newExpanded = new Set(expandedSchedules);
    if (newExpanded.has(scheduleId)) {
      newExpanded.delete(scheduleId);
    } else {
      newExpanded.add(scheduleId);
      loadDetails(scheduleId);
      loadRecords(scheduleId);
    }
    setExpandedSchedules(newExpanded);
  };

  if (loading) {
    return <AttendancePageSkeleton />;
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin') },
          { label: 'Điểm danh', onClick: () => navigate('/admin/attendance'), active: true },
        ]}
        title={selectedClassName ? `Quản lý Điểm danh - ${selectedClassName}` : 'Quản lý Điểm danh'}
        chips={[
          { label: 'Phiên học', value: schedules.length ?? 0, tone: 'indigo' },
          { label: 'Lớp học', value: classes.length ?? 0 },
          { label: 'Sinh viên', value: stats.length ?? 0 },
        ]}
        rightSlot={(
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
            value={selectedClassId ?? ''}
            onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value=""> Chọn lớp </option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      />

      {selectedClassId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Thống kê điểm danh hàng đầu</h3>
            {loadingStats ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : stats.length === 0 ? (
              <p className="text-sm text-gray-500">Không có dữ liệu</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.slice(0, 10).map(s => (
                  <div key={s.studentId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors">
                    <span className="text-gray-900 font-medium truncate flex-1">{s.studentName}</span>
                    <span className="text-indigo-600 font-semibold ml-2">{(s.attendanceRate ?? 0).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tổng quan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Số lượng học viên:</span>
                <span className="text-lg font-semibold text-gray-900">{stats.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng số lượt điểm danh:</span>
                <span className="text-lg font-semibold text-gray-900">{history.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {Array.from(expandedSchedules).map(scheduleId => {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) return null;
        return (
          <div key={`details-${scheduleId}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Chi tiết - {schedule.moduleName}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {details[scheduleId] && details[scheduleId].length > 0 && (
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Danh sách điểm danh</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {details[scheduleId].map(d => (
                      <div key={d.studentId} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="text-sm font-medium text-gray-900">{d.studentName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            d.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                            d.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                            d.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {d.status || 'Chưa xác định'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {records[scheduleId] && records[scheduleId].length > 0 && (
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Bản ghi điểm danh</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sinh viên</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {records[scheduleId].map(r => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">Sinh viên {r.studentId}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                r.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                                r.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                                r.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {/* {parseBackendDate(r.markedAt)?.toLocaleString('vi-VN') || '-'} */}
                              {r.markedAt ? (Array.isArray(r.markedAt) ? new Date(r.markedAt[0], r.markedAt[1] - 1, r.markedAt[2]) : new Date(r.markedAt as string)).toLocaleString('vi-VN') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selectedClassId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Lịch sử điểm danh</h2>
          </div>
          {loadingHistory ? (
            <div className="px-6 py-8">
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Không có lịch sử điểm danh cho lớp này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buổi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((h, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{h.moduleName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {h.sessionTitle || `-`} {h.sessionNumber ? `(Buổi ${h.sessionNumber})` : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {h.sessionDatetime ? new Date(h.sessionDatetime).toLocaleString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg">Vui lòng chọn lớp để xem thông tin điểm danh</p>
        </div>
      )}
    </div>
  );
}
