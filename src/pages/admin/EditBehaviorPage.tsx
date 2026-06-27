import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AdminPageHeader from '../../components/AdminPageHeader';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import {
  updateBehavior,
  getBehaviorById,
  getBehaviorGroupById,
  getAllPointTypes,
  type BehaviorFrequencyType,
  type BehaviorPointType,
  type UpdateBehaviorRequest,
  type GamificationBehaviorGroup,
  type GamificationBehavior,
  getNotificationTemplates,
  type NotificationTemplate,
  type GamificationPointType,
} from '../../services/gamificationApi';
import { getBehaviorActivation, setBehaviorActivation } from '../../utils/behaviorSettings';

const frequencyLabels: Record<BehaviorFrequencyType, string> = {
  UNLIMITED: 'Không giới hạn',
  DAILY: 'Ngày',
  WEEKLY: 'Tuần',
  MONTHLY: 'Module',
  ONCE: 'Một lần duy nhất',
};

export default function EditBehaviorPage() {
  const navigate = useNavigate();
  const { behaviorId } = useParams<{ behaviorId: string }>();
  const { notification, showError, showSuccess, hideNotification } = useNotification();

  const [behavior, setBehavior] = useState<GamificationBehavior | null>(null);
  const [group, setGroup] = useState<GamificationBehaviorGroup | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    frequencyType: 'UNLIMITED' as BehaviorFrequencyType,
    maxTimesPerFrequency: '1',
    pointDiligence: '',
    pointCompetence: '',
    pointExperience: '',
  });

  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [pointTypes, setPointTypes] = useState<GamificationPointType[]>([]);
  const [behaviorPointTypes, setBehaviorPointTypes] = useState<BehaviorPointType[]>([]);
  const [pointTypeSelections, setPointTypeSelections] = useState<Record<number, { checked: boolean; points: string; notificationTemplateId?: string }>>({});

  const breadcrumbs = useMemo(() => [
    { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
    { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
    { label: 'Hành vi điểm thưởng', onClick: () => navigate('/admin/gamification/behaviors') },
    { label: 'Chỉnh sửa hành vi', active: true },
  ], [navigate]);

  useEffect(() => {
    if (!behaviorId) {
      showError('Lỗi', 'Thiếu thông tin hành vi');
      navigate('/admin/gamification/behaviors');
      return;
    }

    const fetchData = async () => {
      try {
        const behaviorData = await getBehaviorById(Number(behaviorId));
        setBehavior(behaviorData);
        setIsActive(getBehaviorActivation(behaviorData.id));
        
        const groupData = await getBehaviorGroupById(behaviorData.groupId);
        setGroup(groupData);

        setFormData({
          name: behaviorData.name,
          frequencyType: behaviorData.frequencyType,
          maxTimesPerFrequency: behaviorData.maxTimesPerFrequency?.toString() ?? '1',
          pointDiligence: behaviorData.pointDiligence?.toString() ?? '',
          pointCompetence: behaviorData.pointCompetence?.toString() ?? '',
          pointExperience: behaviorData.pointExperience?.toString() ?? '',
        });

        const loadedBehaviorPointTypes = behaviorData.behaviorPointTypes || [];
        setBehaviorPointTypes(loadedBehaviorPointTypes);
        initializedRef.current = false; 
        
        initializedRef.current = false;
      } catch (error) {
        console.error('Failed to fetch behavior', error);
        showError('Lỗi', 'Không thể tải thông tin hành vi');
        navigate('/admin/gamification/behaviors');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [behaviorId, showError, navigate]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await getNotificationTemplates();
        setNotificationTemplates(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load notification templates', error);
        showError('Lỗi', 'Không thể tải danh sách thông báo');
      }
    };

    loadTemplates();
    getAllPointTypes()
      .then(setPointTypes)
      .catch((error) => console.error('Failed to load point types', error));
  }, [showError]);

  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (pointTypes.length > 0 && !initializedRef.current) {
      const initialSelections: Record<number, { checked: boolean; points: string; notificationTemplateId?: string }> = {};
      
      pointTypes.forEach((pt) => {
        initialSelections[pt.id] = {
          checked: false,
          points: '',
          notificationTemplateId: undefined,
        };
      });
      
      behaviorPointTypes.forEach((bpt) => {
        if (initialSelections[bpt.pointTypeId]) {
          initialSelections[bpt.pointTypeId] = {
            checked: true,
            points: bpt.points?.toString() ?? '',
            notificationTemplateId: bpt.notificationTemplateId?.toString(),
          };
        }
      });
      
      setPointTypeSelections(initialSelections);
      initializedRef.current = true;
    }
  }, [pointTypes, behaviorPointTypes]);

  useEffect(() => {
    if (Object.keys(pointTypeSelections).length === 0) return;
    
    const selected: BehaviorPointType[] = [];
    for (const [key, val] of Object.entries(pointTypeSelections)) {
      const pointTypeId = Number(key);
      if (!val?.checked) continue;
      if (val.points && !Number.isNaN(parseInt(val.points, 10)) && parseInt(val.points, 10) > 0) {
        const pointsNumber = parseInt(val.points, 10);
        selected.push({
          pointTypeId,
          points: pointsNumber,
          notificationTemplateId: val.notificationTemplateId ? Number(val.notificationTemplateId) : undefined,
        });
      }
    }
    setBehaviorPointTypes(selected);
  }, [pointTypeSelections]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      if (field === 'frequencyType' && (value === 'UNLIMITED' || value === 'ONCE')) {
        updated.maxTimesPerFrequency = '1';
      }
      return updated;
    });
  };

  const togglePointType = (id: number, checked: boolean) => {
    setPointTypeSelections((prev) => ({
      ...prev,
      [id]: { 
        checked, 
        points: prev[id]?.points || '', 
        notificationTemplateId: prev[id]?.notificationTemplateId 
      },
    }));
  };

  const updateSelectionPoints = (id: number, value: string) => {
    setPointTypeSelections((prev) => ({
      ...prev,
      [id]: { 
        ...prev[id], 
        checked: prev[id]?.checked ?? true, 
        points: value 
      },
    }));
  };

  const updateSelectionTemplate = (id: number, value: string | undefined) => {
    setPointTypeSelections((prev) => ({
      ...prev,
      [id]: { 
        ...prev[id], 
        checked: prev[id]?.checked ?? true, 
        notificationTemplateId: value 
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!behavior || !group) return;

    if (!formData.name.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên hành vi');
      return;
    }

    const checkedWithoutPoints: number[] = [];
    for (const [key, val] of Object.entries(pointTypeSelections)) {
      if (val?.checked) {
        const pointTypeId = Number(key);
        if (!val.points || Number.isNaN(parseInt(val.points, 10)) || parseInt(val.points, 10) <= 0) {
          checkedWithoutPoints.push(pointTypeId);
        }
      }
    }

    if (checkedWithoutPoints.length > 0) {
      const pointTypeNames = checkedWithoutPoints
        .map(id => pointTypes.find(pt => pt.id === id)?.name || `PointType #${id}`)
        .join(', ');
      showError('Thiếu cấu hình', `Vui lòng nhập số điểm cho các loại điểm đã chọn: ${pointTypeNames}`);
      return;
    }

    const parsedDiligence = formData.pointDiligence === '' ? 0 : parseInt(formData.pointDiligence, 10) || 0;
    const parsedCompetence = formData.pointCompetence === '' ? 0 : parseInt(formData.pointCompetence, 10) || 0;
    const parsedExperience = formData.pointExperience === '' ? 0 : parseInt(formData.pointExperience, 10) || 0;
    const hasNewPointTypes = behaviorPointTypes.length > 0 && behaviorPointTypes.some((bpt) => (bpt.points ?? 0) > 0);
    const hasLegacyPoints = parsedDiligence > 0 || parsedCompetence > 0 || parsedExperience > 0;

    if (!hasNewPointTypes && !hasLegacyPoints) {
      showError('Thiếu cấu hình', 'Vui lòng chọn ít nhất 1 loại điểm thưởng và nhập số điểm.');
      return;
    }

    const isFrequencyCountDisabled =
      formData.frequencyType === 'UNLIMITED' || formData.frequencyType === 'ONCE';

    const parsedMaxTimes =
      formData.maxTimesPerFrequency && formData.maxTimesPerFrequency !== ''
        ? parseInt(formData.maxTimesPerFrequency, 10)
        : 1;

    const payload: UpdateBehaviorRequest = {
      groupId: group.id,
      name: formData.name.trim(),
      frequencyType: formData.frequencyType,
      maxTimesPerFrequency: isFrequencyCountDisabled
        ? undefined
        : (formData.maxTimesPerFrequency ? parseInt(formData.maxTimesPerFrequency, 10) : undefined),
      pointDiligence: undefined,
      pointCompetence: undefined,
      pointExperience: undefined,
      behaviorPointTypes: behaviorPointTypes,
    };

    try {
      setSubmitting(true);
      const updated = await updateBehavior(behavior.id, payload);
      setBehaviorActivation(updated.id, isActive);
      showSuccess('Thành công', 'Đã cập nhật hành vi');
      navigate('/admin/gamification/behaviors', { state: { updatedBehavior: updated }, replace: false });
    } catch (error) {
      console.error('Failed to update behavior', error);
      showError('Lỗi', 'Không thể cập nhật hành vi');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div>
        <AdminPageHeader breadcrumbs={breadcrumbs} title="Chỉnh sửa hành vi" />
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <p className="text-gray-500">Đang tải thông tin hành vi...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader breadcrumbs={breadcrumbs} title="Chỉnh sửa hành vi" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/admin/gamification/behaviors')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách hành vi
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin hành vi</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kích hoạt</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    ON
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      !isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm hành vi</label>
                  <input
                    type="text"
                    value={group?.name ?? 'Không xác định'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên hành vi chi tiết <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập tên hành vi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại tần suất <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.frequencyType}
                    onChange={(e) => handleInputChange('frequencyType', e.target.value as BehaviorFrequencyType)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng tần suất
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxTimesPerFrequency}
                    onChange={(e) => handleInputChange('maxTimesPerFrequency', e.target.value)}
                    disabled={formData.frequencyType === 'UNLIMITED' || formData.frequencyType === 'ONCE'}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      (formData.frequencyType === 'UNLIMITED' || formData.frequencyType === 'ONCE')
                        ? 'bg-gray-100 cursor-not-allowed'
                        : ''
                    }`}
                    placeholder={
                      (formData.frequencyType === 'UNLIMITED' || formData.frequencyType === 'ONCE')
                        ? 'Không áp dụng (gửi mặc định 1)'
                        : 'Nhập số lượng (mặc định 1)'
                    }
                  />
                  {(formData.frequencyType === 'UNLIMITED' || formData.frequencyType === 'ONCE') && (
                    <p className="text-xs text-gray-500 mt-1">
                      Loại tần suất này không yêu cầu số lượng
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Điểm thưởng theo loại</h3>
            <p className="text-sm text-gray-500">
              Chọn nhiều loại điểm và cấu hình số điểm + thông báo riêng cho từng loại.
            </p>
          </div>

          {pointTypes.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
              Chưa có loại điểm thưởng, vui lòng tạo trước.
            </p>
          ) : (
            <div className="space-y-3">
              {pointTypes.map((pt) => {
                const selection = pointTypeSelections[pt.id] || { checked: false, points: '', notificationTemplateId: undefined };
                const template = notificationTemplates.find((t) => t.id === (selection.notificationTemplateId ? Number(selection.notificationTemplateId) : undefined));
                return (
                  <div
                    key={pt.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selection.checked 
                        ? 'border-indigo-300 bg-indigo-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selection.checked}
                        onChange={(e) => togglePointType(pt.id, e.target.checked)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{pt.name}</p>
                        {pt.description && <p className="text-xs text-gray-500 mt-1">{pt.description}</p>}
                      </div>
                    </div>
                    {selection.checked && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pl-7">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Số điểm <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={selection.points}
                            onChange={(e) => updateSelectionPoints(pt.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="VD: 50"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Thông báo</label>
                          <select
                            value={selection.notificationTemplateId || ''}
                            onChange={(e) =>
                              updateSelectionTemplate(pt.id, e.target.value ? e.target.value : undefined)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Thông báo điểm thưởng mặc định</option>
                            {notificationTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          {template && (
                            <p className="text-xs text-gray-500 mt-1">Đang chọn: {template.name}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/admin/gamification/behaviors')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Hủy thao tác
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Đang cập nhật...' : 'Cập nhật hành vi'}
            </button>
          </div>
        </form>
      </div>

      {notification && (
        <NotificationPopup notification={notification} onClose={hideNotification} />
      )}
    </div>
  );
}

