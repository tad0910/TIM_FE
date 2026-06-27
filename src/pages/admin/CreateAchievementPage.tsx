import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { 
  createAchievement, 
  updateAchievement,
  getAchievementById,
  type CreateAchievementRequest,
  type UpdateAchievementRequest
} from '../../services/gamificationApi';
import { useAuthStore } from '../../store/useAuthStore';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';

export default function CreateAchievementPage() {
  const navigate = useNavigate();
  const { achievementId } = useParams<{ achievementId?: string }>();
  const { user } = useAuthStore();
  const { notification, showSuccess, showWarning, hideNotification, showError } = useNotification();

  const isEdit = Boolean(achievementId);
  const editingId = achievementId ? parseInt(achievementId, 10) : null;

  const [formData, setFormData] = useState<CreateAchievementRequest>({
    name: '',
    createdBy: user?.id ? parseInt(user.id, 10) : undefined,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

  useEffect(() => {
    if (!isEdit || !editingId) return;

    const loadAchievement = async () => {
      try {
        setInitialLoading(true);
        const data = await getAchievementById(editingId);
        setFormData(prev => ({
          ...prev,
          name: data.name,
          createdBy: prev.createdBy,
        }));
        setExistingImageUrl(data.imageUrl || '');
      } catch (error) {
        console.error('Error loading achievement:', error);
        showError('Lỗi', 'Không thể tải thông tin thành tích');
        navigate('/admin/gamification/achievements');
      } finally {
        setInitialLoading(false);
      }
    };

    loadAchievement();
  }, [isEdit, editingId, navigate, showError]);
  const handleInputChange = (field: keyof CreateAchievementRequest, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.name.trim() === '') {
      showWarning('Thiếu thông tin', 'Vui lòng nhập tên thành tích');
      return;
    }

    try {
      setLoading(true);
      if (isEdit && editingId) {
        const payload: UpdateAchievementRequest = {
          name: formData.name,
          imageUrl: !selectedFile && existingImageUrl ? existingImageUrl : undefined,
        };
        await updateAchievement(editingId, payload, selectedFile || undefined);
        showSuccess('Thành công', 'Đã cập nhật thành tích thành công');
      } else {
        await createAchievement(formData, selectedFile || undefined);
        showSuccess('Thành công', 'Đã tạo thành tích thành công');
      }
      setTimeout(() => {
        navigate('/admin/gamification/achievements');
      }, 1200);
    } catch (error) {
      console.error('Error creating achievement:', error);
      showError('Lỗi', isEdit ? 'Không thể cập nhật thành tích' : 'Không thể tạo thành tích');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/gamification/achievements');
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
          { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
          { label: 'Thành tích', onClick: () => navigate('/admin/gamification/achievements') },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới', active: true },
        ]}
        title={isEdit ? 'Chỉnh sửa thành tích' : 'Thêm thành tích'}
      />

      <div className="mt-6 mb-4">
        <button
          onClick={() => navigate('/admin/gamification/achievements')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách thành tích
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        {initialLoading ? (
          <div className="min-h-[200px] flex items-center justify-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/*
            // Kích hoạt - BE chưa hỗ trợ nên tạm ẩn UI này
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kích hoạt
              </label>
              <div className="flex gap-0">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border-2 transition-colors bg-indigo-600 text-white border-indigo-600"
                  disabled
                >
                  ON
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border-2 transition-colors bg-white text-gray-700 border-gray-300"
                  disabled
                >
                  OFF
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lưu ý: Trường này chỉ để hiển thị, không được lưu vào hệ thống
              </p>
            </div>
          */}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tên thành tích <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/*
            // Mô tả - BE chưa hỗ trợ nên tạm ẩn UI này
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                id="description"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lưu ý: Trường này chỉ để hiển thị, không được lưu vào hệ thống
              </p>
            </div>

            // Điểm cao nhất - BE chưa hỗ trợ nên tạm ẩn UI này
            <div>
              <label htmlFor="maxPoints" className="block text-sm font-medium text-gray-700 mb-2">
                Điểm cao nhất
              </label>
              <input
                type="text"
                id="maxPoints"
                value="0"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lưu ý: Trường này chỉ để hiển thị, không được lưu vào hệ thống
              </p>
            </div>

            // Hiển thị dashboard - BE chưa hỗ trợ nên tạm ẩn UI này
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hiển thị dashboard
              </label>
              <div className="flex gap-0">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border-2 transition-colors bg-indigo-600 text-white border-indigo-600"
                  disabled
                >
                  ON
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border-2 transition-colors bg-white text-gray-700 border-gray-300"
                  disabled
                >
                  OFF
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lưu ý: Trường này chỉ để hiển thị, không được lưu vào hệ thống
              </p>
            </div>
          */}

          {/* Hình ảnh */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hình ảnh
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors inline-block">
                  Chọn file
                </span>
              </label>
              <span className="text-sm text-gray-600">
                {selectedFile
                  ? selectedFile.name
                  : existingImageUrl
                    ? 'Đang sử dụng ảnh hiện tại'
                    : 'Chưa có file nào được chọn'}
              </span>
              {existingImageUrl && !selectedFile && (
                <a
                  href={existingImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Xem ảnh hiện tại
                </a>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Hủy thao tác
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
        )}
      </div>

      {notification && (
        <NotificationPopup
          notification={notification}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}

