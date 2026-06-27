import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: roleApi.getAllRoles,
  });

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: roleApi.getAllPermissions,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permIds }: { roleId: number; permIds: number[] }) => 
      roleApi.updateRolePermissions(roleId, permIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      showSuccess('Thành công', 'Đã cập nhật quyền cho vai trò');
      setSelectedRole(null);
    },
    onError: (err) => showApiError(err, 'Lỗi cập nhật quyền'),
  });

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
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

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permIds: Array.from(selectedPermissions)
    });
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Vai trò</h1>
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
                key: 'permissions', 
                header: 'Số Quyền',
                render: (r) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{r.permissions?.length || 0} quyền</span>
              },
              {
                key: 'actions',
                header: 'Thao tác',
                align: 'right',
                render: (r) => (
                  <Button size="sm" variant="outline" onClick={() => handleEditRole(r)}>
                    Sửa quyền
                  </Button>
                )
              }
            ]}
          />
        </div>

        {selectedRole && (
          <Modal
            isOpen={!!selectedRole}
            onClose={() => setSelectedRole(null)}
            title={`Phân quyền: ${selectedRole.name}`}
            maxWidth="2xl"
            footer={
              <>
                <Button variant="secondary" onClick={() => setSelectedRole(null)}>Hủy</Button>
                <Button 
                  isLoading={updatePermissionsMutation.isPending} 
                  onClick={handleSavePermissions}
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
                      {perm.description && <span className="text-xs text-slate-500 mt-0.5">{perm.description}</span>}
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
      </div>
    </ErrorBoundary>
  );
}
