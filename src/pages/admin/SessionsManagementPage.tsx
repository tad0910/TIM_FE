import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { getSessionsByModule } from '../../services/moduleSessionApi';
import type { SessionDetailDTO } from '../../services/moduleSessionApi';
import type { Module } from '../../types/module';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';

export default function SessionsManagementPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDetailDTO[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();

  useEffect(() => {
    setModulesLoading(true);
    api.get<Module[]>('/module')
      .then((data) => setModules(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load modules:', err);
        const message = showApiError(err, 'Không thể tải danh sách module. Vui lòng thử lại.', 'Lỗi tải module');
        setError(message);
      })
      .finally(() => setModulesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedModuleId) {
      setSessions([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getSessionsByModule(selectedModuleId)
      .then((data) => setSessions(Array.isArray(data) ? [...data].sort((a,b)=>a.id-b.id) : []))
      .catch((err) => {
        console.error('Failed to load sessions:', err);
        const message = showApiError(err, 'Không thể tải danh sách buổi học. Vui lòng thử lại.', 'Lỗi tải buổi học');
        setError(message);
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [selectedModuleId]);

  const handleDelete = (id: number) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/modules/sessions/${deleteTarget}`);
      if (selectedModuleId) {
        const data = await getSessionsByModule(selectedModuleId);
        setSessions(Array.isArray(data) ? data : []);
      }
      setDeleteTarget(null);
      showSuccess('Xóa buổi học', 'Buổi học đã được xóa.');
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      showApiError(err, 'Không thể xóa buổi học. Vui lòng thử lại.', 'Lỗi xóa buổi học');
    }
  };

  const handleCreate = async (data: { title: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => {
    if (!selectedModuleId) { showWarning('Thiếu thông tin', 'Vui lòng chọn module'); return; }
    try {
      await api.post(`/modules/${selectedModuleId}/sessions`, data);
      setShowCreateModal(false);
      setLoading(true);
      const refreshed = await getSessionsByModule(selectedModuleId);
      setSessions(Array.isArray(refreshed) ? refreshed : []);
      showSuccess('Tạo buổi học', 'Đã tạo buổi học mới.');
    } catch (err) {
      console.error('Failed to create session:', err);
      showApiError(err, 'Không thể tạo buổi học. Vui lòng thử lại.', 'Lỗi tạo buổi học');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, data: { title?: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => {
    try {
      await api.put(`/modules/sessions/${id}`, data);
      setSelectedSession(null);
      if (selectedModuleId) {
        setLoading(true);
        const refreshed = await getSessionsByModule(selectedModuleId);
        setSessions(Array.isArray(refreshed) ? [...refreshed].sort((a,b)=>a.id-b.id) : []);
      }
      showSuccess('Cập nhật buổi học', 'Thông tin buổi học đã được cập nhật.');
    } catch (err) {
      console.error('Failed to update session:', err);
      showApiError(err, 'Không thể cập nhật buổi học. Vui lòng thử lại.', 'Lỗi cập nhật buổi học');
    } finally {
      setLoading(false);
    }
  };

  const sttOrder = useMemo(() => {
    return [...sessions.map(s => s.id)].sort((a, b) => a - b);
  }, [sessions]);

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin') },
          { label: 'Buổi học', onClick: () => navigate('/admin/sessions'), active: true },
        ]}
        title="Quản lý Buổi học"
        chips={[
          { label: 'Module', value: selectedModuleId ?? '-' },
          { label: 'Tổng số', value: sessions.length ?? 0, tone: 'indigo' },
        ]}
        rightSlot={(
          <button onClick={() => { if (!selectedModuleId) { showWarning('Thiếu thông tin', 'Vui lòng chọn module'); return; } setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={!selectedModuleId}>
            <PlusIcon className="w-5 h-5" />
            Tạo buổi học mới
          </button>
        )}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Module</label>
        <select 
          value={selectedModuleId || ''} 
          onChange={(e) => setSelectedModuleId(e.target.value ? Number(e.target.value) : null)} 
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full max-w-xs"
          disabled={modulesLoading}
        >
          <option value=""> Chọn Module </option>
          {modules.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
        </select>
        {modulesLoading && (
          <p className="mt-1 text-sm text-gray-500">Đang tải danh sách module...</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số buổi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!selectedModuleId ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Vui lòng chọn module để xem danh sách buổi học</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Chưa có buổi học nào</td></tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{sttOrder.indexOf(s.id) + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{s.sessionNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium">{s.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="max-w-md truncate" title={s.content || '-'}>
                          {s.content || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedSession(s)} className="text-indigo-600 hover:text-indigo-900 p-1"><PencilIcon className="w-5 h-5" /></button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && selectedModuleId && (
        <CreateSessionModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} notify={{ showWarning }} />
      )}

      {selectedSession && (
        <EditSessionModal session={selectedSession} onClose={() => setSelectedSession(null)} onSave={(d) => handleUpdate(selectedSession.id, d)} />
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget !== null && (
        <Transition appear show as={Fragment}>
          <Dialog as="div" className="relative z-[1000]" onClose={() => setDeleteTarget(null)}>
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-opacity"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150 transition-opacity"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild
                  as={Fragment}
                  enter="ease-out duration-200 transition-all"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-150 transition-all"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h2" className="text-lg font-semibold mb-2">Xóa buổi học</DialogTitle>
                    <p className="text-sm text-gray-600 mb-4">Bạn có chắc muốn xóa buổi học này?</p>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                      <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Xóa</button>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}

function CreateSessionModal({ onClose, onSave, notify }: { onClose: () => void; onSave: (data: { title: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => void; notify: { showWarning: (title: string, message?: string) => void } }) {
  const [formData, setFormData] = useState({ title: '', content: '', sessionNumber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { notify.showWarning('Thiếu thông tin', 'Vui lòng kiểm tra các trường bắt buộc'); return; }
    onSave({ title: formData.title, content: formData.content || undefined, sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined });
  };
  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <DialogTitle as="h2" className="text-xl font-bold mb-4">Tạo buổi học mới</DialogTitle>
                <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={5} /></div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Số buổi</label><input type="number" value={formData.sessionNumber} onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Tạo</button></div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function EditSessionModal({ session, onClose, onSave }: { session: SessionDetailDTO; onClose: () => void; onSave: (data: { title?: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => void }) {
  const [formData, setFormData] = useState({ title: session.title, content: session.content || '', sessionNumber: String(session.sessionNumber || '') });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({ title: formData.title, content: formData.content || undefined, sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined });
  };
  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <DialogTitle as="h2" className="text-xl font-bold mb-4">Chỉnh sửa buổi học</DialogTitle>
                <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={5} /></div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Số buổi</label><input type="number" value={formData.sessionNumber} onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Lưu</button></div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
