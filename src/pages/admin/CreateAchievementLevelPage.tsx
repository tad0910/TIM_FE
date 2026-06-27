import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { 
  createAchievementLevel, 
  updateAchievementLevel,
  getAchievementLevelById,
  getAchievementById,
  getAllPointTypes,
  type CreateAchievementLevelRequest,
  type GamificationAchievement,
  type GamificationPointType,
  getNotificationTemplates,
  type NotificationTemplate
} from '../../services/gamificationApi';
import { useAchievementLevelsStore } from '../../store/useAchievementLevelsStore';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';

export default function CreateAchievementLevelPage() {
  const navigate = useNavigate();
  const { achievementId, levelId } = useParams<{ achievementId: string; levelId?: string }>();
  const { notification, showError, showSuccess, showWarning, hideNotification } = useNotification();
  const { addLevelToCache, updateLevelInCache } = useAchievementLevelsStore();

  const isEdit = Boolean(levelId);
  const editingLevelId = levelId ? parseInt(levelId, 10) : null;

  const [achievement, setAchievement] = useState<GamificationAchievement | null>(null);
  const [pointTypes, setPointTypes] = useState<GamificationPointType[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [formData, setFormData] = useState<CreateAchievementLevelRequest>({
    achievementId: achievementId ? parseInt(achievementId, 10) : 0,
    levelName: '',
    requiredPointTypeId: undefined,
    requiredPointTypeEnum: undefined,
    minPointsRequired: 0,
    notificationTemplateId: undefined,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [minPointsInput, setMinPointsInput] = useState<string>('0');
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

  useEffect(() => {
    const fetchData = async () => {
      if (!achievementId) return;
      
      try {
        setInitialLoading(true);
        const [achievementData, pointTypesData] = await Promise.all([
          getAchievementById(parseInt(achievementId, 10)),
          getAllPointTypes()
        ]);
        
        setAchievement(achievementData);
        setPointTypes(pointTypesData);
        getNotificationTemplates()
          .then(setNotificationTemplates)
          .catch((error) => console.error('Error fetching notification templates', error));

        if (isEdit && editingLevelId) {
          const levelData = await getAchievementLevelById(editingLevelId);
          setFormData({
            achievementId: levelData.achievementId ?? parseInt(achievementId, 10),
            levelName: levelData.levelName,
            requiredPointTypeId: levelData.requiredPointTypeId ?? undefined,
            requiredPointTypeEnum: levelData.requiredPointTypeEnum ?? undefined,
            minPointsRequired: levelData.minPointsRequired ?? 0,
            imageUrl: levelData.imageUrl,
            notificationTemplateId: levelData.notificationTemplateId ?? undefined,
          });
          setMinPointsInput((levelData.minPointsRequired ?? 0).toString());
          setExistingImageUrl(levelData.imageUrl || '');
        } else {
          setFormData(prev => ({
            ...prev,
            achievementId: parseInt(achievementId, 10),
          }));
          setMinPointsInput('0');
          setExistingImageUrl('');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Lỗi', 'Không thể tải dữ liệu');
        navigate(`/admin/gamification/achievements/${achievementId}/levels`);
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchData();
  }, [achievementId, isEdit, editingLevelId, navigate, showError]);

  const handleInputChange = (field: keyof CreateAchievementLevelRequest, value: string | number | undefined) => {
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
    
    if (!formData.levelName || formData.levelName.trim() === '') {
      showWarning('Thiếu thông tin', 'Vui lòng nhập tên cấp bậc thành tích');
      return;
    }

    if (!formData.requiredPointTypeId) {
      showWarning('Thiếu thông tin', 'Vui lòng chọn điểm thưởng');
      return;
    }

    try {
      setLoading(true);
      const finalAchievementId = formData.achievementId || (achievementId ? parseInt(achievementId, 10) : 0);
      if (!finalAchievementId) {
        showError('Lỗi', 'Không tìm thấy ID thành tích');
        return;
      }
      
      const payload: CreateAchievementLevelRequest = {
        ...formData,
        achievementId: finalAchievementId,
        imageUrl: !selectedFile && existingImageUrl ? existingImageUrl : undefined,
      };

      if (isEdit && editingLevelId) {
        const updated = await updateAchievementLevel(editingLevelId, payload, selectedFile || undefined);
        showSuccess('Thành công', 'Đã cập nhật cấp bậc thành tích thành công');
        if (achievementId) {
          updateLevelInCache(parseInt(achievementId, 10), editingLevelId, updated);
        }
      } else {
        const newLevel = await createAchievementLevel(payload, selectedFile || undefined);
        showSuccess('Thành công', 'Đã tạo cấp bậc thành tích thành công');
        if (achievementId) {
          addLevelToCache(parseInt(achievementId, 10), newLevel);
        }
      }
      setTimeout(() => {
        navigate(`/admin/gamification/achievements/${achievementId}/levels`);
      }, 1200);
    } catch (error) {
      console.error('Error creating achievement level:', error);
      showError('Lỗi', isEdit ? 'Không thể cập nhật cấp bậc thành tích' : 'Không thể tạo cấp bậc thành tích');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/gamification/achievements/${achievementId}/levels`);
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
          { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
          { label: 'Thành tích', onClick: () => navigate('/admin/gamification/achievements') },
          { label: achievement?.name || 'Cấp bậc thành tích', onClick: () => navigate(`/admin/gamification/achievements/${achievementId}/levels`) },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới', active: true },
        ]}
        title={isEdit ? 'Chỉnh sửa cấp bậc thành tích' : 'Thêm cấp bậc thành tích'}
      />

      <div className="mt-6 mb-4">
        <button
          onClick={() => navigate(`/admin/gamification/achievements/${achievementId}/levels`)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách cấp bậc thành tích
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        {initialLoading ? (
          <div className="min-h-[200px] flex items-center justify-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="levelName" className="block text-sm font-medium text-gray-700 mb-2">
              Tên cấp bậc thành tích <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="levelName"
              value={formData.levelName}
              onChange={(e) => handleInputChange('levelName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="achievement" className="block text-sm font-medium text-gray-700 mb-2">
              Thành tích
            </label>
            <input
              type="text"
              id="achievement"
              value={achievement?.name || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

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

          <div>
            <label htmlFor="achievementMethod" className="block text-sm font-medium text-gray-700 mb-2">
              Cách để đạt thành tích
            </label>
            <select
              id="achievementMethod"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              defaultValue="min_points"
            >
              <option value="min_points">Đạt điểm tối thiểu của một loại điểm</option>
            </select>
          </div>

          <div>
            <label htmlFor="pointType" className="block text-sm font-medium text-gray-700 mb-2">
              Điểm thưởng <span className="text-red-500">*</span>
            </label>
            <select
              id="pointType"
              value={formData.requiredPointTypeId || ''}
              onChange={(e) => handleInputChange('requiredPointTypeId', e.target.value ? parseInt(e.target.value, 10) : undefined)}
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
            <label htmlFor="minPoints" className="block text-sm font-medium text-gray-700 mb-2">
              Điểm tối thiểu
            </label>
            <input
              type="text"
              id="minPoints"
              value={minPointsInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setMinPointsInput(value);
                  const numValue = value === '' ? 0 : parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    handleInputChange('minPointsRequired', numValue);
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value === '' || value === '0') {
                  setMinPointsInput('0');
                  handleInputChange('minPointsRequired', 0);
                } else {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    setMinPointsInput(numValue.toString());
                    handleInputChange('minPointsRequired', numValue);
                  }
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="notificationTemplate" className="block text-sm font-medium text-gray-700 mb-2">
              Thông báo khi đạt
            </label>
            <select
              id="notificationTemplate"
              value={formData.notificationTemplateId ?? ''}
              onChange={(e) =>
                handleInputChange(
                  'notificationTemplateId',
                  e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Sử dụng template mặc định / không gửi riêng</option>
              {notificationTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {formData.notificationTemplateId && (
              <p className="text-xs text-gray-500 mt-1">
                Đang chọn: {notificationTemplates.find((t) => t.id === formData.notificationTemplateId)?.name ?? 'Template'}
              </p>
            )}
            {!formData.notificationTemplateId && (
              <p className="text-xs text-gray-500 mt-1">
                Để xóa thông báo tùy chỉnh của cấp bậc (nếu có), chọn tùy chọn mặc định.
              </p>
            )}
          </div>

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

