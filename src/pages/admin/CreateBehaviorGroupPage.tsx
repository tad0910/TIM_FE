import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import {
  createBehaviorGroup,
  getAllBehaviorGroups,
} from '../../services/gamificationApi';
import { insertGroupWithOrder } from '../../utils/behaviorSettings';

export default function CreateBehaviorGroupPage() {
  const navigate = useNavigate();
  const { notification, showError, showSuccess, hideNotification } = useNotification();

  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [existingCount, setExistingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getAllBehaviorGroups();
        setExistingCount(data.length);
        setDisplayOrder(String(data.length + 1));
      } catch (error) {
        console.error('Failed to load groups', error);
        showError('Lỗi', 'Không thể tải danh sách nhóm hành vi');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [showError]);

  const breadcrumbs = useMemo(() => ([
    { label: 'Quản trị', onClick: () => navigate('/admin/dashboard') },
    { label: 'Gamification', onClick: () => navigate('/admin/gamification') },
    { label: 'Hành vi điểm thưởng', onClick: () => navigate('/admin/gamification/behaviors') },
    { label: 'Thêm nhóm', active: true },
  ]), [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    const orderNumber = parseInt(displayOrder, 10);
    if (Number.isNaN(orderNumber) || orderNumber < 1) {
      showError('Lỗi', 'Thứ tự hiển thị phải là số tự nhiên >= 1');
      return;
    }

    try {
      setSubmitting(true);
      const group = await createBehaviorGroup({ name: name.trim() });
      insertGroupWithOrder(group.id, orderNumber);
      showSuccess('Thành công', 'Đã tạo nhóm hành vi mới');
      setTimeout(() => navigate('/admin/gamification/behaviors'), 1200);
    } catch (error) {
      console.error('Failed to create behavior group', error);
      showError('Lỗi', 'Không thể tạo nhóm hành vi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader breadcrumbs={breadcrumbs} title="Thêm nhóm hành vi" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/admin/gamification/behaviors/groups')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách nhóm hành vi
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        {loading ? (
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên nhóm hành vi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập tên nhóm hành vi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder={`Ví dụ: ${existingCount + 1}`}
              />
              <p className="text-xs text-gray-500 mt-2">
                Nếu nhập trùng thứ tự đã có ({existingCount} nhóm hiện tại), vị trí mới sẽ được chèn và các nhóm phía sau sẽ tự động đẩy xuống.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/gamification/behaviors/groups')}
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
                {submitting ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          </form>
        )}
      </div>

      {notification && (
        <NotificationPopup notification={notification} onClose={hideNotification} />
      )}
    </div>
  );
}


