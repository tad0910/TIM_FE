import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { 
  deleteAchievementLevel,
  updateAchievementLevel,
  getNotificationTemplates,
  type AchievementLevel,
  type GamificationPointType,
  type NotificationTemplate
} from '../../services/gamificationApi';
import { useAchievementLevelsStore } from '../../store/useAchievementLevelsStore';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';

export default function AchievementLevelsListPage() {
  const navigate = useNavigate();
  const { achievementId } = useParams<{ achievementId: string }>();
  const achievementIdNum = achievementId ? parseInt(achievementId, 10) : null;
  
  const {
    cache,
    loading: loadingMap,
    fetchData,
    updateLevelInCache,
    removeLevelFromCache,
  } = useAchievementLevelsStore();
  
  const cachedData = achievementIdNum ? cache[achievementIdNum] : null;
  const levels = cachedData?.levels ?? [];
  const achievement = cachedData?.achievement ?? null;
  const pointTypes = cachedData?.pointTypes ?? [];
  const loading = achievementIdNum 
    ? (loadingMap[achievementIdNum] ?? (!cachedData && true))
    : false;
  
  const [deleteTarget, setDeleteTarget] = useState<AchievementLevel | null>(null);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [editingLevel, setEditingLevel] = useState<AchievementLevel | null>(null);
  const [editLevelName, setEditLevelName] = useState<string>('');
  const [editPointTypeId, setEditPointTypeId] = useState<number | ''>('');
  const [editMinPointsInput, setEditMinPointsInput] = useState<string>('0');
  const [editNotificationTemplateId, setEditNotificationTemplateId] = useState<number | ''>('');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editExistingImageUrl, setEditExistingImageUrl] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const { notification, showError, showSuccess, hideNotification, showApiError } = useNotification();

  useEffect(() => {
    if (achievementIdNum) {
      fetchData(achievementIdNum);
    }
  }, [achievementIdNum, fetchData]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await getNotificationTemplates();
        setNotificationTemplates(templates);
      } catch (error) {
        console.error('Failed to load notification templates', error);
      }
    };
    loadTemplates();
  }, []);

  const openEditModal = (level: AchievementLevel) => {
    setEditingLevel(level);
    setEditLevelName(level.levelName);
    setEditPointTypeId(level.requiredPointTypeId ?? '');
    setEditMinPointsInput(String(level.minPointsRequired ?? 0));
    setEditNotificationTemplateId(level.notificationTemplateId ?? '');
    setEditSelectedFile(null);
    setEditExistingImageUrl(level.imageUrl || '');
  };

  const closeEditModal = () => {
    setEditingLevel(null);
    setEditLevelName('');
    setEditPointTypeId('');
    setEditMinPointsInput('0');
    setEditNotificationTemplateId('');
    setEditSelectedFile(null);
    setEditExistingImageUrl('');
  };

  const handleEditMinPointsChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setEditMinPointsInput(value);
      const numericValue = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(numericValue)) {
      }
    }
  };

  const handleEditMinPointsBlur = (value: string) => {
    if (value === '' || value === '0') {
      setEditMinPointsInput('0');
    } else {
      const numericValue = parseInt(value, 10);
      if (!isNaN(numericValue)) {
        setEditMinPointsInput(numericValue.toString());
      }
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditSelectedFile(file);
    }
  };

  const handleUpdateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel || !achievementIdNum) return;

    if (!editLevelName.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên cấp bậc thành tích');
      return;
    }

    if (editPointTypeId === '') {
      showError('Lỗi', 'Vui lòng chọn điểm thưởng');
      return;
    }

    const minPointsValue = parseInt(editMinPointsInput || '0', 10);

    try {
      setEditLoading(true);
      const updated = await updateAchievementLevel(
        editingLevel.id,
        {
          achievementId: achievementIdNum,
          levelName: editLevelName,
          requiredPointTypeId: typeof editPointTypeId === 'number' ? editPointTypeId : parseInt(editPointTypeId, 10),
          requiredPointTypeEnum: editingLevel.requiredPointTypeEnum,
          minPointsRequired: isNaN(minPointsValue) ? 0 : minPointsValue,
          imageUrl: !editSelectedFile && editExistingImageUrl ? editExistingImageUrl : undefined,
          notificationTemplateId: editNotificationTemplateId === '' ? null : (typeof editNotificationTemplateId === 'number' ? editNotificationTemplateId : parseInt(editNotificationTemplateId, 10)),
        },
        editSelectedFile || undefined
      );
      showSuccess('Thành công', 'Đã cập nhật cấp bậc thành tích thành công');
      closeEditModal();
      updateLevelInCache(achievementIdNum, editingLevel.id, updated);
    } catch (error) {
      console.error('Error updating achievement level:', error);
      showError('Lỗi', 'Không thể cập nhật cấp bậc thành tích');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !achievementIdNum) return;
    
    try {
      await deleteAchievementLevel(deleteTarget.id);
      showSuccess('Thành công', 'Đã xóa cấp bậc thành tích thành công');
      setDeleteTarget(null);
      removeLevelFromCache(achievementIdNum, deleteTarget.id);
    } catch (error) {
      console.error('Error deleting achievement level:', error);
      showApiError(error, 'Không thể xóa cấp độ thành tích');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div>
        <AdminPageHeader
          breadcrumbs={[
            { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
            { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
            { label: 'Thành tích', onClick: () => navigate('/admin/gamification/achievements') },
            { label: achievement?.name || 'Cấp bậc thành tích', active: true },
          ]}
          title={achievement ? `Cấp bậc thành tích: ${achievement.name}` : 'Cấp bậc thành tích'}
        />
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
          { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
          { label: 'Thành tích', onClick: () => navigate('/admin/gamification/achievements') },
          { label: achievement?.name || 'Cấp bậc thành tích', active: true },
        ]}
        title={achievement ? `Cấp bậc thành tích: ${achievement.name}` : 'Cấp bậc thành tích'}
        chips={[
          { label: 'Tổng số', value: levels.length, tone: 'indigo' },
        ]}
      />

      <div className="mt-6 mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/gamification/achievements')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách thành tích
        </button>
        <button
          onClick={() => navigate(`/admin/gamification/achievements/${achievementId}/levels/create`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm mới
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên cấp bậc thành tích
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {levels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                levels.map((level, index) => (
                  <tr key={level.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {level.imageUrl ? (
                        <img
                          src={level.imageUrl}
                          alt={level.levelName}
                          className="h-12 w-12 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/48?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {level.levelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(level.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(level)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Sửa"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(level)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Xóa"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa cấp bậc thành tích <strong>"{deleteTarget.levelName}"</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <NotificationPopup
          notification={notification}
          onClose={hideNotification}
        />
      )}

      {editingLevel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Chỉnh sửa cấp bậc thành tích
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateLevel} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thành tích
                </label>
                <input
                  type="text"
                  value={achievement?.name || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="editLevelName" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên cấp bậc thành tích <span className="text-red-500">*</span>
                </label>
                <input
                  id="editLevelName"
                  type="text"
                  value={editLevelName}
                  onChange={(e) => setEditLevelName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cách để đạt thành tích
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                  value="min_points"
                >
                  <option value="min_points">Đạt điểm tối thiểu của một loại điểm</option>
                </select>
              </div>

              <div>
                <label htmlFor="editPointType" className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm thưởng <span className="text-red-500">*</span>
                </label>
                <select
                  id="editPointType"
                  value={editPointTypeId === '' ? '' : editPointTypeId}
                  onChange={(e) => setEditPointTypeId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value=""> Chọn điểm thưởng </option>
                  {pointTypes.map((pointType) => (
                    <option key={pointType.id} value={pointType.id}>
                      {pointType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="editMinPoints" className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm tối thiểu
                </label>
                <input
                  id="editMinPoints"
                  type="text"
                  value={editMinPointsInput}
                  onChange={(e) => handleEditMinPointsChange(e.target.value)}
                  onBlur={(e) => handleEditMinPointsBlur(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hình ảnh
                </label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileChange}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors inline-block">
                      Chọn file
                    </span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {editSelectedFile
                      ? editSelectedFile.name
                      : editExistingImageUrl
                        ? 'Đang sử dụng ảnh hiện tại'
                        : 'Chưa có file nào được chọn'}
                  </span>
                  {editExistingImageUrl && !editSelectedFile && (
                    <a
                      href={editExistingImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Xem ảnh hiện tại
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="editNotificationTemplate" className="block text-sm font-medium text-gray-700 mb-2">
                  Thông báo khi đạt
                </label>
                <select
                  id="editNotificationTemplate"
                  value={editNotificationTemplateId === '' ? '' : editNotificationTemplateId}
                  onChange={(e) => setEditNotificationTemplateId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Sử dụng template mặc định / không gửi riêng</option>
                  {(notificationTemplates || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {editNotificationTemplateId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Đang chọn: {(notificationTemplates || []).find((t) => t.id === editNotificationTemplateId)?.name ?? 'Template'}
                  </p>
                )}
                {!editNotificationTemplateId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Để xóa thông báo tùy chỉnh của cấp bậc (nếu có), chọn tùy chọn mặc định.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={editLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={editLoading}
                >
                  {editLoading ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

