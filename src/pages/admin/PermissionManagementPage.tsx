import React from 'react';
import { useQuery } from '@tanstack/react-query';
import roleApi from '../../services/roleApi';
import Table from '../../components/ui/Table';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function PermissionManagementPage() {
  const { data: permissions = [], isLoading, isError } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: roleApi.getAllPermissions,
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Quyền hạn</h1>
        </div>
        
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Không thể tải danh sách quyền hạn.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <Table
            isLoading={isLoading}
            data={permissions}
            keyExtractor={(p) => p.id}
            columns={[
              { key: 'id', header: 'ID', width: '80px' },
              { key: 'name', header: 'Tên Quyền' },
              { key: 'description', header: 'Mô tả' }
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
