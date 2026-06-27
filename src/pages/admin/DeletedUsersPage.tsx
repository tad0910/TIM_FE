import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw } from 'lucide-react';

import { useAdminHeader } from '../../components/admin/layout/AdminShell';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import { restoreUser, getAllUsersIncludingDeleted, type User } from '../../services/userApi';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function DeletedUsersPage() {
  const navigate = useNavigate();
  const { updateHeader, resetHeader } = useAdminHeader();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'id'|'username'>('id');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const { notification, showSuccess, hideNotification, showApiError } = useNotification();

  useEffect(() => {
    updateHeader({
      title: 'Người dùng đã xóa',
      breadcrumbs: [
        { label: 'Quản trị', href: '/admin' },
        { label: 'Người dùng', href: '/admin/users' },
        { label: 'Đã xóa' },
      ],
    });
    return () => resetHeader();
  }, [navigate, resetHeader, updateHeader]);

  const isDeletedFlag = (u: User) => Boolean((u as any)?.deleted || (u as any)?.isDeleted || (u as any)?.deletedAt);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const page = await getAllUsersIncludingDeleted(0, 1000, `${sortKey},${sortDir}`);
      const content = Array.isArray(page?.content) ? page.content : [];
      setUsers(content.filter(isDeletedFlag));
    } catch (err: unknown) {
      const message = showApiError(
        err,
        'Không thể tải danh sách người dùng đã xóa. Vui lòng thử lại.',
        'Lỗi tải người dùng đã xóa'
      );
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [sortKey, sortDir]);

  const toggleSort = (key: 'id'|'username') => {
    setCurrentPage(0);
    if (sortKey === key) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => {
      const username = user.username?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim();
      return username.includes(keyword) || email.includes(keyword) || fullName.includes(keyword);
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleRestore = async (userId: number) => {
    try {
      await restoreUser(userId);
      showSuccess('Khôi phục thành công', 'Người dùng đã được khôi phục.');
      await fetchUsers();
    } catch (err: unknown) {
      showApiError(err, 'Không thể khôi phục người dùng. Vui lòng thử lại.', 'Lỗi khôi phục người dùng');
    }
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={7} className="px-6 py-8">
            <TableSkeleton rows={4} columns={7} />
          </td>
        </tr>
      );
    }

    if (pagedUsers.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
            {users.length === 0 ? 'Không có người dùng đã xóa' : 'Không tìm thấy người dùng phù hợp'}
          </td>
        </tr>
      );
    }

    return pagedUsers.map((user, index) => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-';
      const primaryRole = (user.roles && user.roles[0]?.name) || user.role || '-';
      const deletedAt = (user as any)?.deletedAt || '-';

      return (
        <tr
          key={user.id}
          className="rounded-lg border border-slate-100 bg-white text-sm text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50"
        >
          <td className="px-4 py-3 text-center font-semibold text-slate-600">
            {currentPage * pageSize + index + 1}
          </td>
          <td className="px-4 py-3 font-semibold text-slate-900">{fullName}</td>
          <td className="px-4 py-3 text-slate-600">{user.username || '-'}</td>
          <td className="px-4 py-3 text-slate-600">{user.email || '-'}</td>
          <td className="px-4 py-3 text-indigo-600">{primaryRole}</td>
          <td className="px-4 py-3 text-slate-500">{deletedAt}</td>
          <td className="px-4 py-3 text-right">
            <button
              type="button"
              onClick={() => handleRestore(user.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              Khôi phục
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" />
          Quay về quản lý
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
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
                {key === 'id' ? 'STT' : 'Tên'} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
          </div>
          <div className="ml-auto flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(0);
                }}
                placeholder="Tìm theo tên, username, email..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Kích thước trang</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-5 py-4">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-16 px-4 py-2 text-center">STT</th>
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Vai trò</th>
                <th className="px-4 py-2">Đã xóa lúc</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {pagedUsers.length} / {filteredUsers.length} người dùng
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setCurrentPage((prev) => (prev + 1 >= totalPages ? prev : prev + 1))
              }
              disabled={currentPage + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}
