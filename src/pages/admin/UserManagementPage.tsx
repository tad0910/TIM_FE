import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { User, CreateUserRequest, UpdateUserRequest } from '../../services/userApi';
import TableSkeleton from '../../components/TableSkeleton';
import { useNotification } from '../../hooks/useNotification';
import { useAdminUsers, useAdminUserMutations } from '../../hooks/useAdminUsers';
import { getDisplayName } from './utils/userDisplay';

import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ErrorBoundary } from '../../components/ErrorBoundary';

import UserTable from './components/users/UserTable';
import CreateUserModal from './components/users/CreateUserModal';
import EditUserModal from './components/users/EditUserModal';
import DeleteUserModal from './components/users/DeleteUserModal';

const ALLOWED_ROLES = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_GIAOVIEN'] as const;

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortKey, setSortKey] = useState<'id'|'username'>('id');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { showSuccess, showApiError } = useNotification();

  const toggleSort = (key: 'id'|'username') => {
    setCurrentPage(0);
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const usersQueryParams = useMemo(
    () => ({
      page: currentPage,
      size: pageSize,
      sort: `${sortKey},${sortDir}`,
      searchTerm: searchTerm
    }),
    [currentPage, pageSize, sortKey, sortDir, searchTerm]
  );

  const usersQuery = useAdminUsers(usersQueryParams);
  const { createUserMutation, updateUserMutation, deleteUserMutation } = useAdminUserMutations(usersQueryParams);

  useEffect(() => {
    setAvailableRoles([...ALLOWED_ROLES]);
  }, []);

  useEffect(() => {
    if (usersQuery.data) {
      setTotalPages(usersQuery.data.totalPages || 0);
      setTotalElements(usersQuery.data.totalElements || 0);
    }
    if (!usersQuery.isLoading) {
      setInitialLoading(false);
    }
    if (usersQuery.isError) {
      const message = showApiError(
        usersQuery.error,
        'Không thể tải danh sách người dùng.',
        'Lỗi tải người dùng'
      );
      setError(message);
    } else {
      setError(null);
    }
  }, [usersQuery.data, usersQuery.isLoading, usersQuery.isError, usersQuery.error, showApiError]);

  const users = usersQuery.data?.content ?? [];

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const displayName = getDisplayName(user).toLowerCase();
      const username = user.username?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return displayName.includes(keyword) || username.includes(keyword) || email.includes(keyword);
    });
  }, [users, searchTerm]);

  const handleDelete = (userId: number) => {
    const u = users.find((x) => x.id === userId) || null;
    setDeleteTarget(u);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUserMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess('Xóa người dùng thành công', 'Người dùng đã được xóa khỏi hệ thống.');
    } catch (error: unknown) {
      showApiError(error, 'Không thể xóa người dùng. Vui lòng thử lại.', 'Lỗi xóa người dùng');
    }
  };

  const handleCreate = async (data: CreateUserRequest) => {
    try {
      await createUserMutation.mutateAsync(data);
      setShowCreateModal(false);
      showSuccess('Tạo người dùng thành công', 'Người dùng mới đã được thêm.');
    } catch (error: unknown) {
      showApiError(error, 'Không thể tạo người dùng. Vui lòng thử lại.', 'Lỗi tạo người dùng');
    }
  };

  const handleUpdate = async (userId: number, data: UpdateUserRequest) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, data });
      setSelectedUser(null);
      showSuccess('Cập nhật người dùng thành công', 'Thông tin người dùng đã được cập nhật.');
    } catch (error: unknown) {
      showApiError(error, 'Không thể cập nhật người dùng. Vui lòng thử lại.', 'Lỗi cập nhật người dùng');
    }
  };

  if (initialLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Tài khoản</h1>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  const usersContent = (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <form
          className="relative w-full max-w-md flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchTerm(searchInput);
            setCurrentPage(0);
          }}
        >
          <div className="flex-1">
            <Input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên, username, email..."
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button type="submit" variant="secondary">Tìm kiếm</Button>
        </form>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/users/deleted')}
          >
            Người dùng đã xóa
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Thêm người dùng
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-600 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-500">Sắp xếp theo:</span>
            {(['id', 'username'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                  sortKey === key
                    ? 'border-teal-200 bg-teal-50 text-teal-600'
                    : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {key === 'id' ? 'ID' : 'Tên'} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span>Kích thước trang</span>
            <select
              value={pageSize}
              onChange={(event) => {
                const size = Number(event.target.value);
                setPageSize(size);
                setCurrentPage(0);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <UserTable
          users={users}
          filteredUsers={filteredUsers}
          rowOffset={currentPage * pageSize}
          onSelectUser={setSelectedUser}
          onDeleteUser={handleDelete}
          isError={usersQuery.isError}
          errorMessage={error}
        />

        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600 bg-slate-50">
          <span>
            Hiển thị {filteredUsers.length} / {totalElements} người dùng
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Trước
            </Button>
            <span className="px-2">
              Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => (prev + 1 >= totalPages ? prev : prev + 1))
              }
              disabled={currentPage + 1 >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      </section>

      {showCreateModal && (
        <CreateUserModal
          availableRoles={availableRoles}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          submitting={createUserMutation.isPending}
        />
      )}

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          availableRoles={availableRoles}
          onClose={() => setSelectedUser(null)}
          onSave={(data) => handleUpdate(selectedUser.id, data)}
          submitting={updateUserMutation.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          submitting={deleteUserMutation.isPending}
        />
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Danh sách Người dùng</h1>
        </div>
        {usersContent}
      </div>
    </ErrorBoundary>
  );
}