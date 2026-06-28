import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import roleApi from '../../services/roleApi';
import type { Role } from '../../services/roleApi';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useNotification } from '../../hooks/useNotification';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function RoleManagementPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showApiError } = useNotification();
  
  // State for Roles
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  
  const [roleFormModal, setRoleFormModal] = useState<{isOpen: boolean, role?: Role}>({isOpen: false});
  const [roleFormData, setRoleFormData] = useState({ name: '', code: '' });
  
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: roleApi.getAllRoles,
  });

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: roleApi.getAllPermissions,
  });

  // Role Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: Partial<Role>) => roleApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      showSuccess('Thành công', 'Đã thêm vai trò mới');
      setRoleFormModal({isOpen: false});
    },
    onError: (err) => showApiError(err, 'Lỗi thêm vai trò'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Role> }) => roleApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      showSuccess('Thành công', 'Đã cập nhật vai trò');
      setRoleFormModal({isOpen: false});
    },
    onError: (err) => showApiError(err, 'Lỗi cập nhật vai trò'),
  });
  
  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => roleApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      showSuccess('Thành công', 'Đã xóa vai trò');
      setDeleteTarget(null);
    },
    onError: (err) => showApiError(err, 'Lỗi xóa vai trò'),
  });

  // Role Permissions Update
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permIds }: { roleId: number; permIds: number[] }) => 
      roleApi.updateRolePermissions(roleId, permIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      showSuccess('Thành công', 'Đã cập nhật quyền cho vai trò');
      setSelectedRoleForPerms(null);
    },
    onError: (err) => showApiError(err, 'Lỗi phân quyền'),
  });

  // Handlers
  const handleEditRolePerms = (role: Role) => {
    setSelectedRoleForPerms(role);
    setSelectedPermissions(new Set(role.permissions?.map(p => p.id) || []));
  };

  const handleTogglePermission = (permId: number) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleSaveRolePermissions = () => {
    if (!selectedRoleForPerms) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRoleForPerms.id,
      permIds: Array.from(selectedPermissions)
    });
  };

  const openRoleForm = (role?: Role) => {
    setRoleFormData({ name: role?.name || '', code: role?.code || '' });
    setRoleFormModal({ isOpen: true, role });
  };

  const submitRoleForm = () => {
    if (roleFormModal.role) {
      updateRoleMutation.mutate({ id: roleFormModal.role.id, data: roleFormData });
    } else {
      createRoleMutation.mutate(roleFormData);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteRoleMutation.mutate(deleteTarget.id);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Quản lý Vai trò</h2>
            <Button onClick={() => openRoleForm()}>Thêm Vai Trò</Button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <Table
              isLoading={isLoadingRoles}
              data={roles}
              keyExtractor={(r) => r.id}
              columns={[
                { key: 'id', header: 'ID', width: '80px' },
                { key: 'name', header: 'Tên Vai Trò' },
                { 
                  key: 'code', 
                  header: 'Mã Vai Trò',
                  render: (r) => <span className="font-mono text-sm text-slate-600">{r.code}</span>
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  render: (r) => (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditRolePerms(r)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="Phân quyền"
                      >
                        <ShieldCheckIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openRoleForm(r)} 
                        className="text-teal-600 hover:text-teal-900 p-1"
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(r)} 
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

        {/* Modal Phân Quyền */}
        {selectedRoleForPerms && (
          <Modal
            isOpen={!!selectedRoleForPerms}
            onClose={() => setSelectedRoleForPerms(null)}
            title={`Phân quyền: ${selectedRoleForPerms.name}`}
            maxWidth="2xl"
            footer={
              <>
                <Button variant="secondary" onClick={() => setSelectedRoleForPerms(null)}>Hủy</Button>
                <Button 
                  isLoading={updatePermissionsMutation.isPending} 
                  onClick={handleSaveRolePermissions}
                >
                  Lưu Thay Đổi
                </Button>
              </>
            }
          >
            {isLoadingPermissions ? (
              <div className="flex justify-center p-8"><span className="animate-pulse">Đang tải quyền...</span></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {permissions.map(perm => (
                  <label key={perm.id} className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      checked={selectedPermissions.has(perm.id)}
                      onChange={() => handleTogglePermission(perm.id)}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{perm.name}</span>
                      <span className="text-xs font-mono text-slate-500 mt-0.5">{perm.code}</span>
                    </div>
                  </label>
                ))}
                {permissions.length === 0 && (
                  <p className="col-span-2 text-center text-slate-500 py-4">Không có quyền nào được định nghĩa trong hệ thống.</p>
                )}
              </div>
            )}
          </Modal>
        )}

        {/* Modal Role Form */}
        {roleFormModal.isOpen && (
          <Modal
            isOpen={roleFormModal.isOpen}
            onClose={() => setRoleFormModal({isOpen: false})}
            title={roleFormModal.role ? "Cập nhật Vai trò" : "Thêm Vai trò"}
            footer={
              <>
                <Button variant="secondary" onClick={() => setRoleFormModal({isOpen: false})}>Hủy</Button>
                <Button 
                  isLoading={createRoleMutation.isPending || updateRoleMutation.isPending} 
                  onClick={submitRoleForm}
                >
                  Lưu
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Vai trò</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  value={roleFormData.name}
                  onChange={e => setRoleFormData({...roleFormData, name: e.target.value})}
                  placeholder="VD: Quản trị viên"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Vai trò (Code)</label>
                <input 
                  type="text" 
                  className="w-full font-mono text-sm rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 uppercase"
                  value={roleFormData.code}
                  onChange={e => setRoleFormData({...roleFormData, code: e.target.value.toUpperCase()})}
                  placeholder="VD: ROLE_ADMIN"
                  disabled={!!roleFormModal.role} 
                />
                <p className="text-xs text-gray-500 mt-1">Mã vai trò phải viết hoa và không chứa khoảng trắng.</p>
              </div>
            </div>
          </Modal>
        )}
        
        {/* Confirm Delete Modal */}
        {deleteTarget && (
          <Modal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            title="Xóa Vai Trò"
            footer={
              <>
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Hủy</Button>
                <Button variant="danger" isLoading={deleteRoleMutation.isPending} onClick={confirmDelete}>Xóa</Button>
              </>
            }
          >
            <p>Bạn có chắc chắn muốn xóa vai trò <strong>{deleteTarget.name}</strong> không? Hành động này không thể hoàn tác.</p>
          </Modal>
        )}
      </div>
    </ErrorBoundary>
  );
}
