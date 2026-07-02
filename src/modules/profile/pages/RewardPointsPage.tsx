import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationPopup from '../../../components/NotificationPopup';
import TableSkeleton from '../../../components/TableSkeleton';
import Pagination from '../../../components/Pagination';
import { useNotification } from '../../../hooks/useNotification';
import PageLayout from '../../../components/layout/PageLayout';
import { getMyGamificationStats, getMyPointLogsPage, type UserGamificationStats, type UserPointLog } from '../../../services/gamificationApi';
import { formatAbsoluteTime } from '../../../utils/timeFormat';

export default function RewardPointsPage() {
  const navigate = useNavigate();
  const { notification, hideNotification, showApiError } = useNotification();

  const [stats, setStats] = useState<UserGamificationStats | null>(null);
  const [pointLogs, setPointLogs] = useState<UserPointLog[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(0);
  const [logsTotalElements, setLogsTotalElements] = useState(0);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [view, setView] = useState<'stats' | 'history'>('stats');
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  useEffect(() => {
    void fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await getMyGamificationStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch gamification stats:', error);
      showApiError(error, 'Không thể tải điểm thưởng.', 'Lỗi tải dữ liệu');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchHistory = async (page = 0, size = logsPageSize) => {
    try {
      setLoadingLogs(true);
      const response = await getMyPointLogsPage(page, size);
      setPointLogs(response.content || []);
      setLogsPage(response.number ?? page);
      setLogsTotalPages(response.totalPages ?? 0);
      setLogsTotalElements(response.totalElements ?? (response.content?.length ?? 0));
    } catch (error) {
      console.error('Failed to fetch point logs:', error);
      showApiError(error, 'Không thể tải lịch sử điểm.', 'Lỗi tải dữ liệu');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleViewHistory = async () => {
    setView('history');
    await fetchHistory(0, logsPageSize);
  };

  const handleBackToStats = () => {
    setView('stats');
  };

  const handleLogsPageChange = async (page: number) => {
    await fetchHistory(page, logsPageSize);
  };

  const handleLogsPageSizeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setLogsPageSize(newSize);
    await fetchHistory(0, newSize);
  };

  const renderStatsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Tổng quan</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">Điểm thưởng tích lũy</h2>
        </div>
        <button
          onClick={handleViewHistory}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
        >
          Lịch sử điểm
        </button>
      </div>

      {loadingStats ? (
        <TableSkeleton rows={3} columns={3} />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Chuyên cần</p>
            </div>
            <p className="mt-4 text-3xl font-bold text-[#1E3A8A]">{stats.totalDiligence?.toLocaleString('vi-VN') || 0}</p>
            <p className="mt-2 text-xs text-gray-400">
              Cập nhật: {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Năng lực</p>
            </div>
            <p className="mt-4 text-3xl font-bold text-emerald-700">{stats.totalCompetence?.toLocaleString('vi-VN') || 0}</p>
            <p className="mt-2 text-xs text-gray-400">
              Cập nhật: {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Kinh nghiệm</p>
            </div>
            <p className="mt-4 text-3xl font-bold text-amber-600">{stats.totalExperience?.toLocaleString('vi-VN') || 0}</p>
            <p className="mt-2 text-xs text-gray-400">
              Cập nhật: {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          Chưa có dữ liệu điểm thưởng
        </div>
      )}
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBackToStats}
            className="p-2 text-gray-500 hover:text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-colors"
          >
            ←
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lịch sử điểm</h2>
            <p className="text-gray-500 text-sm mt-1">
              Thống kê chi tiết các hành vi mang lại điểm thưởng cho bạn.
            </p>
          </div>
        </div>

        {loadingLogs ? (
          <TableSkeleton rows={5} columns={5} />
        ) : pointLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-xl">
                    Hành vi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Điểm chuyên cần
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Điểm năng lực
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Điểm kinh nghiệm
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-xl">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {pointLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.behaviorName || (log.behaviorId ? `Behavior ${log.behaviorId}` : '—')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                      {log.pointsDiligenceEarned ? `+${log.pointsDiligenceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold">
                      {log.pointsCompetenceEarned ? `+${log.pointsCompetenceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-semibold">
                      {log.pointsExperienceEarned ? `+${log.pointsExperienceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') || '—' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Hiển thị</span>
                <select
                  value={logsPageSize}
                  onChange={handleLogsPageSizeChange}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size} mục</option>
                  ))}
                </select>
              </div>
              <Pagination
                currentPage={logsPage}
                totalPages={logsTotalPages}
                totalElements={logsTotalElements}
                pageSize={logsPageSize}
                onPageChange={handleLogsPageChange}
                itemName="lịch sử"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">Chưa có lịch sử điểm thưởng nào.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Điểm thưởng"
      description="Theo dõi điểm thưởng từ các hoạt động gamification và xem lại lịch sử nhận điểm của bạn."
    >
      <div className="w-full space-y-6">
        <NotificationPopup notification={notification} onClose={hideNotification} />

        {view === 'stats' ? renderStatsView() : renderHistoryView()}
      </div>
    </PageLayout>
  );
}

