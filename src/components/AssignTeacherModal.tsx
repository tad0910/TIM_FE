import React, { Fragment, useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { 
  getScheduleTeachers, 
  assignTeacherToSchedule, 
  removeTeacherFromSchedule,
  updateScheduleTeacherRole,
  type ClassModuleScheduleTeacherDTO 
} from '../services/scheduleApi';
import { api } from '../services/api';

interface AssignTeacherModalProps {
  scheduleId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignTeacherModal({ scheduleId, onClose, onSuccess }: AssignTeacherModalProps) {
  const [teachers, setTeachers] = useState<ClassModuleScheduleTeacherDTO[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; username: string; email: string; firstName?: string; lastName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'LECTURER' | 'SUPPORTER' | 'OBSERVER'>('LECTURER');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teachersData, usersData] = await Promise.all([
        getScheduleTeachers(scheduleId),
        api.get<Array<{ id: number; username: string; email: string; firstName?: string; lastName?: string }>>('/users')
      ]);
      setTeachers(teachersData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Vui lòng chọn giáo viên');
      return;
    }

    try {
      setIsAdding(true);
      setError(null);
      await assignTeacherToSchedule(scheduleId, {
        userId: Number(selectedUserId),
        role: selectedRole
      });
      setShowAddForm(false);
      setSelectedUserId('');
      setSelectedRole('LECTURER');
      loadData();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Không thể thêm giáo viên');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTeacher = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn xóa giáo viên này khỏi buổi học?')) return;

    try {
      await removeTeacherFromSchedule(scheduleId, userId);
      loadData();
      onSuccess();
    } catch (err: any) {
      alert('Không thể xóa giáo viên: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleUpdateRole = async (userId: number, newRole: 'LECTURER' | 'SUPPORTER' | 'OBSERVER') => {
    try {
      await updateScheduleTeacherRole(scheduleId, userId, newRole);
      loadData();
      onSuccess();
    } catch (err: any) {
      alert('Không thể cập nhật vai trò: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'LECTURER': return 'bg-blue-100 text-blue-800';
      case 'SUPPORTER': return 'bg-green-100 text-green-800';
      case 'OBSERVER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const availableUsers = users.filter(u => !teachers.some(t => t.userId === u.id));

  return (
    <Transition appear show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (!isAdding) onClose();
        }}
      >
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
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <DialogTitle as="h2" className="text-xl font-bold">Gán giáo viên cho buổi học</DialogTitle>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAdding}
                    type="button"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Đang tải...</div>
        ) : (
          <>
            {/* List of assigned teachers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Giáo viên đã gán ({teachers.length})</h3>
              {teachers.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có giáo viên nào được gán</p>
              ) : (
                <div className="space-y-2">
                  {teachers.map((teacher) => {
                    const user = users.find(u => u.id === teacher.userId);
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {user 
                              ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username)
                              : `User ID: ${teacher.userId}`}
                          </div>
                          <div className="text-sm text-gray-500">{user?.email}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={teacher.role}
                            onChange={(e) => handleUpdateRole(teacher.userId, e.target.value as 'LECTURER' | 'SUPPORTER' | 'OBSERVER')}
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(teacher.role)}`}
                          >
                            <option value="LECTURER">Giảng viên chính</option>
                            <option value="SUPPORTER">Hỗ trợ</option>
                            <option value="OBSERVER">Quan sát</option>
                          </select>
                          <button
                            onClick={() => handleRemoveTeacher(teacher.userId)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Xóa giáo viên"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add teacher form */}
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                + Thêm giáo viên
              </button>
            ) : (
              <form onSubmit={handleAddTeacher} className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Thêm giáo viên mới</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn giáo viên *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value=""> Chọn giáo viên </option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">Tất cả giáo viên đã được gán</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'LECTURER' | 'SUPPORTER' | 'OBSERVER')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="LECTURER">Giảng viên chính</option>
                    <option value="SUPPORTER">Hỗ trợ</option>
                    <option value="OBSERVER">Quan sát</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedUserId('');
                      setSelectedRole('LECTURER');
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isAdding}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    disabled={isAdding || !selectedUserId}
                  >
                    {isAdding ? 'Đang thêm...' : 'Thêm'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

