import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import roleApi from '../../services/roleApi';
import type { Permission } from '../../services/roleApi';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useNotification } from '../../hooks/useNotification';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function PermissionManagementPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showApiError } = useNotification();
  
  // State for Permissions
  const [permFormModal, setPermFormModal] = useState<{isOpen: boolean, permission?: Permission}>({isOpen: false});
  const [permFormData, setPermFormData] = useState({ name: '', code: '', description: '' });
  
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: roleApi.getAllPermissions,
  });

  // Permission Mutations
  const createPermMutation = useMutation({
    mutationFn: (data: Partial<Permission>) => roleApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      showSuccess('Thành công', 'Đã thêm quyền mới');
      setPermFormModal({isOpen: false});
    },
    onError: (err) => showApiError(err, 'Lỗi thêm quyền'),
  });

  const updatePermMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Permission> }) => roleApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      showSuccess('Thành công', 'Đã cập nhật quyền');
      setPermFormModal({isOpen: false});
    },
    onError: (err) => showApiError(err, 'Lỗi cập nhật quyền'),
  });

  const deletePermMutation = useMutation({
    mutationFn: (id: number) => roleApi.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      showSuccess('Thành công', 'Đã xóa quyền');
      setDeleteTarget(null);
    },
    onError: (err) => showApiError(err, 'Lỗi xóa quyền'),
  });

  // Handlers
  const openPermForm = (permission?: Permission) => {
    setPermFormData({ name: permission?.name || '', code: permission?.code || '', description: permission?.description || '' });
    setPermFormModal({ isOpen: true, permission });
  };

  const submitPermForm = () => {
    if (permFormModal.permission) {
      updatePermMutation.mutate({ id: permFormModal.permission.id, data: permFormData });
    } else {
      createPermMutation.mutate(permFormData);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) deletePermMutation.mutate(deleteTarget.id);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
        
        {/* Quyền Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Quản lý Quyền (Permissions)</h2>
            <Button onClick={() => openPermForm()}>Thêm Quyền</Button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <Table
              isLoading={isLoadingPermissions}
              data={permissions}
              keyExtractor={(p) => p.id}
              columns={[
                { key: 'id', header: 'ID', width: '80px' },
                { key: 'name', header: 'Tên Quyền' },
                { 
                  key: 'code', 
                  header: 'Mã Quyền',
                  render: (p) => <span className="font-mono text-sm text-slate-600">{p.code}</span>
                },
                { key: 'description', header: 'Mô tả' },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  render: (p) => (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openPermForm(p)} 
                        className="text-teal-600 hover:text-teal-900 p-1"
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(p)} 
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Xóa"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>

        {/* Modal Permission Form */}
        {permFormModal.isOpen && (
          <Modal
            isOpen={permFormModal.isOpen}
            onClose={() => setPermFormModal({isOpen: false})}
            title={permFormModal.permission ? "Cập nhật Quyền" : "Thêm Quyền"}
            footer={
              <>
                <Button variant="secondary" onClick={() => setPermFormModal({isOpen: false})}>Hủy</Button>
                <Button 
                  isLoading={createPermMutation.isPending || updatePermMutation.isPending} 
                  onClick={submitPermForm}
                >
                  Lưu
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Quyền</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  value={permFormData.name}
                  onChange={e => setPermFormData({...permFormData, name: e.target.value})}
                  placeholder="VD: Đọc danh sách công ty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Quyền (Code)</label>
                <input 
                  type="text" 
                  className="w-full font-mono text-sm rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  value={permFormData.code}
                  onChange={e => setPermFormData({...permFormData, code: e.target.value})}
                  placeholder="VD: company.read.all"
                  disabled={!!permFormModal.permission}
                />
                <p className="text-xs text-gray-500 mt-1">Mã quyền phải theo định dạng: module.tính_năng.hành_động</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea 
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  value={permFormData.description}
                  onChange={e => setPermFormData({...permFormData, description: e.target.value})}
                  placeholder="VD: Cho phép người dùng xem danh sách công ty trong hệ thống"
                  rows={3}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Delete Modal */}
        {deleteTarget && (
          <Modal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            title="Xóa Quyền"
            footer={
              <>
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Hủy</Button>
                <Button variant="danger" isLoading={deletePermMutation.isPending} onClick={confirmDelete}>Xóa</Button>
              </>
            }
          >
            <p>Bạn có chắc chắn muốn xóa quyền <strong>{deleteTarget.name}</strong> không? Hành động này không thể hoàn tác.</p>
          </Modal>
        )}
      </div>
    </ErrorBoundary>
  );
}
