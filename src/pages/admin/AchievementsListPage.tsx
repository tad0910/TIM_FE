import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { 
  deleteAchievement,
  updateAchievement,
  createAchievement,
  type GamificationAchievement,
  type CreateAchievementRequest
} from '../../services/gamificationApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useAchievementsStore } from '../../store/useAchievementsStore';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';
import Pagination from '../../components/Pagination';

interface AchievementWithCreator extends GamificationAchievement {
  creatorName?: string;
}

export default function AchievementsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    achievements, 
    loading, 
    fetchAchievements, 
    updateAchievementInCache, 
    removeAchievementFromCache,
    addAchievementToCache,
    page,
    totalPages,
    totalElements,
    pageSize: storePageSize,
    getPageData,
  } = useAchievementsStore();
  const [currentPage, setCurrentPage] = useState(page ?? 0);
  const [pageSize, setPageSize] = useState(storePageSize || 5);
  const [deleteTarget, setDeleteTarget] = useState<AchievementWithCreator | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<AchievementWithCreator | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editExistingImageUrl, setEditExistingImageUrl] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState<string>('');
  const [createSelectedFile, setCreateSelectedFile] = useState<File | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const { notification, showError, showSuccess, showWarning, hideNotification } = useNotification();

  const cachedPage = getPageData(currentPage, pageSize);
  const achievementsToDisplay =
    cachedPage?.achievements ??
    (currentPage === page ? achievements : []);
  const totalPagesToDisplay = cachedPage?.totalPages ?? totalPages;
  const totalElementsToDisplay = cachedPage?.totalElements ?? totalElements;

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAchievement(deleteTarget.id);
      showSuccess('Thành công', 'Đã xóa thành tích thành công');
      setDeleteTarget(null);
      removeAchievementFromCache(deleteTarget.id);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      showError('Lỗi', 'Không thể xóa thành tích');
    }
  };

  useEffect(() => {
    const cached = getPageData(currentPage, pageSize);
    if (cached) {
      return;
    }
    fetchAchievements(currentPage, pageSize);
  }, [fetchAchievements, currentPage, getPageData, pageSize]);

  const openEditModal = (achievement: AchievementWithCreator) => {
    setEditingAchievement(achievement);
    setEditName(achievement.name);
    setEditExistingImageUrl(achievement.imageUrl || '');
    setEditSelectedFile(null);
  };

  const closeEditModal = () => {
    setEditingAchievement(null);
    setEditName('');
    setEditExistingImageUrl('');
    setEditSelectedFile(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditSelectedFile(file);
    }
  };

  const handleUpdateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAchievement) return;

    if (!editName.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên thành tích');
      return;
    }

    try {
      setEditLoading(true);
      const updated = await updateAchievement(
        editingAchievement.id,
        {
          name: editName,
          imageUrl: !editSelectedFile && editExistingImageUrl ? editExistingImageUrl : undefined,
        },
        editSelectedFile || undefined
      );
      showSuccess('Thành công', 'Đã cập nhật thành tích thành công');
      closeEditModal();
      updateAchievementInCache(editingAchievement.id, updated);
    } catch (error) {
      console.error('Error updating achievement:', error);
      showError('Lỗi', 'Không thể cập nhật thành tích');
    } finally {
      setEditLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateName('');
    setCreateSelectedFile(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateName('');
    setCreateSelectedFile(null);
  };

  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateSelectedFile(file);
    }
  };

  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createName.trim()) {
      showWarning('Thiếu thông tin', 'Vui lòng nhập tên thành tích');
      return;
    }

    let success = false;
    try {
      setCreateLoading(true);
      const formData: CreateAchievementRequest = {
        name: createName,
        createdBy: user?.id ? parseInt(user.id, 10) : undefined,
      };
      const newAchievement = await createAchievement(formData, createSelectedFile || undefined);

      const duration = 3000;
      showSuccess('Thành công', 'Đã tạo thành tích thành công', duration);
      success = true;

      setTimeout(async () => {
        await addAchievementToCache(newAchievement);
        closeCreateModal();
        setCreateLoading(false);
      }, duration);
    } catch (error) {
      console.error('Error creating achievement:', error);
      showError('Lỗi', 'Không thể tạo thành tích');
    } finally {
      if (!success) {
        setCreateLoading(false);
      }
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchAchievements(newPage, pageSize);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(0);
  };

  if (loading && !cachedPage) {
    return (
      <div>
        <AdminPageHeader
          breadcrumbs={[
            { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
            { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
            { label: 'Thành tích', active: true },
          ]}
          title="Danh sách thành tích"
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
          { label: 'Thành tích', active: true },
        ]}
        title="Danh sách thành tích"
        chips={[
          { label: 'Tổng số', value: totalElementsToDisplay, tone: 'indigo' },
        ]}
      />

      <div className="mt-6 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Thêm mới
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Mỗi trang</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
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
                  Tên thành tích
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người tạo
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
              {achievementsToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                achievementsToDisplay.map((achievement, index) => (
                  <tr 
                    key={achievement.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/gamification/achievements/${achievement.id}/levels`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {achievement.imageUrl ? (
                        <img
                          src={achievement.imageUrl}
                          alt={achievement.name}
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
                      {achievement.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {achievement.creatorName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(achievement.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(achievement)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Sửa"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(achievement)}
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

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPagesToDisplay}
          totalElements={totalElementsToDisplay}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemName="thành tích"
        />
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa thành tích <strong>"{deleteTarget.name}"</strong>? Hành động này không thể hoàn tác.
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

      {editingAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Chỉnh sửa thành tích
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateAchievement} className="space-y-6">
              <div>
                <label htmlFor="editAchievementName" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên thành tích <span className="text-red-500">*</span>
                </label>
                <input
                  id="editAchievementName"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Thêm thành tích
              </h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAchievement} className="space-y-6">
              <div>
                <label htmlFor="createAchievementName" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên thành tích <span className="text-red-500">*</span>
                </label>
                <input
                  id="createAchievementName"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
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
                      onChange={handleCreateFileChange}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors inline-block">
                      Chọn file
                    </span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {createSelectedFile
                      ? createSelectedFile.name
                      : 'Chưa có file nào được chọn'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={createLoading}
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createLoading}
                >
                  {createLoading ? 'Đang xử lý...' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <NotificationPopup
          notification={notification}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}

