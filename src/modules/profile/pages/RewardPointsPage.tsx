import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationPopup from '../../../components/NotificationPopup';
import TableSkeleton from '../../../components/TableSkeleton';
import Pagination from '../../../components/Pagination';
import { useNotification } from '../../../hooks/useNotification';
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
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Điểm thưởng</h2>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi tổng điểm thưởng bạn đã nhận được từ các hành vi trong gamification.
          </p>
        </div>
        <button
          onClick={handleViewHistory}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Lịch sử điểm
        </button>
      </div>

      {loadingStats ? (
        <TableSkeleton rows={3} columns={3} />
      ) : stats ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập nhật lần cuối
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Điểm chuyên cần
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {stats.totalDiligence?.toLocaleString('vi-VN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Điểm năng lực
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {stats.totalCompetence?.toLocaleString('vi-VN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Điểm kinh nghiệm
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {stats.totalExperience?.toLocaleString('vi-VN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stats.updatedAt ? formatAbsoluteTime(stats.updatedAt, { format: 'datetime' }) || '—' : '—'}
                </td>
              </tr>
            </tbody>
          </table>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mỗi trang</span>
                <select
                  value={logsPageSize}
                  onChange={handleLogsPageSizeChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <Pagination
                currentPage={logsPage}
                totalPages={logsTotalPages}
                totalElements={logsTotalElements}
                pageSize={logsPageSize}
                onPageChange={handleLogsPageChange}
                itemName="lịch sử điểm"
              />
            </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Chưa có dữ liệu điểm thưởng
        </div>
      )}
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          onClick={handleBackToStats}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <span className="text-lg">←</span>
          <span>Quay lại</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Lịch sử điểm</h2>
          <p className="text-gray-500 text-sm mt-1">
            Thống kê chi tiết các hành vi mang lại điểm thưởng cho bạn.
          </p>
        </div>

        {loadingLogs ? (
          <TableSkeleton rows={5} columns={5} />
        ) : pointLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành vi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm chuyên cần
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm năng lực
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm kinh nghiệm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pointLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.behaviorName || (log.behaviorId ? `Behavior ${log.behaviorId}` : '—')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.pointsDiligenceEarned ? `+${log.pointsDiligenceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.pointsCompetenceEarned ? `+${log.pointsCompetenceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.pointsExperienceEarned ? `+${log.pointsExperienceEarned}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* {log.createdAt ? formatAbsoluteTime(log.createdAt, { format: 'datetime' }) || '—' : '—'} */}
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') || '—' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <Pagination
                currentPage={logsPage}
                totalPages={logsTotalPages}
                totalElements={logsTotalElements}
                pageSize={logsPageSize}
                onPageChange={handleLogsPageChange}
                itemName="lịch sử điểm"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có lịch sử điểm
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <NotificationPopup notification={notification} onClose={hideNotification} />

        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Điểm thưởng</h1>
          <p className="text-gray-600">
            Theo dõi điểm thưởng từ các hoạt động gamification và xem lại lịch sử nhận điểm.
          </p>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => navigate('/scores')}
            className="px-6 py-3 rounded-lg font-medium transition-colors bg-white text-gray-700 hover:bg-gray-50"
          >
            Điểm học tập
          </button>
          <button
            className="px-6 py-3 rounded-lg font-medium transition-colors bg-indigo-600 text-white"
          >
            Điểm thưởng
          </button>
        </div>

        {view === 'stats' ? renderStatsView() : renderHistoryView()}
      </div>
    </div>
  );
}

