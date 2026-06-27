import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSessionsByModulePaged,
  createSession,
  updateSession,
  deleteSession,
  type SessionDetailDTO,
} from "../../services/moduleSessionApi";
import type { PageResponse } from "../../types/pagination";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import { moduleApi } from "../../services/moduleApi";
import { queryKeys } from "../../hooks/api/queryKeys";

export default function ModuleSessionsPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { updateHeader, resetHeader } = useAdminHeader();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailDTO | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<'title' | 'id'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { notification, showSuccess, hideNotification, showApiError } = useNotification();
  const queryClient = useQueryClient();

  const moduleQuery = useQuery({
    queryKey: moduleId ? queryKeys.modules.detail(moduleId) : ["admin", "modules", "detail", "missing"],
    enabled: Boolean(moduleId),
    queryFn: async () => {
      if (!moduleId) throw new Error("Thiếu moduleId");
      return moduleApi.getModuleById(Number(moduleId));
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sessionsQuery = useQuery<PageResponse<SessionDetailDTO>>({
    queryKey: moduleId
      ? queryKeys.modules.sessions.list(moduleId, {
          page: currentPage,
          size: pageSize,
          sortKey,
          sortDir,
        })
      : ["admin", "modules", "sessions", "missing"],
    enabled: Boolean(moduleId),
    queryFn: async () => {
      if (!moduleId) throw new Error("Thiếu moduleId");
      return getSessionsByModulePaged(
        Number(moduleId),
        currentPage,
        pageSize,
        `${sortKey},${sortDir}`
      );
    },
    placeholderData: (previousData: PageResponse<SessionDetailDTO> | undefined) =>
      previousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => {
      if (!moduleId) throw new Error("Thiếu moduleId");
      return createSession(moduleId, data);
    },
    onSuccess: async () => {
      setShowCreateModal(false);
      setCreateError(null);
      showSuccess('Tạo buổi học', 'Đã tạo buổi học mới.');
      await queryClient.invalidateQueries({
        queryKey: moduleId ? queryKeys.modules.sessions.root(moduleId) : undefined,
      });
    },
    onError: (err: any) => {
      const message = showApiError(err, 'Không thể tạo buổi học. Vui lòng thử lại.', 'Lỗi tạo buổi học');
      setCreateError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; content?: string; sessionNumber?: number; scheduledAt?: string } }) => {
      return updateSession(id, data);
    },
    onSuccess: async () => {
      setSelectedSession(null);
      showSuccess('Cập nhật buổi học', 'Thông tin buổi học đã được cập nhật.');
      await queryClient.invalidateQueries({
        queryKey: moduleId ? queryKeys.modules.sessions.root(moduleId) : undefined,
      });
    },
    onError: (err: any) => {
      showApiError(err, 'Không thể cập nhật buổi học. Vui lòng thử lại.', 'Lỗi cập nhật buổi học');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteSession(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      showSuccess('Xóa buổi học', 'Buổi học đã được xóa.');
      await queryClient.invalidateQueries({
        queryKey: moduleId ? queryKeys.modules.sessions.root(moduleId) : undefined,
      });
    },
    onError: (err: any) => {
      showApiError(err, 'Không thể xóa buổi học. Vui lòng thử lại.', 'Lỗi xóa buổi học');
    },
  });

  useEffect(() => {
    updateHeader({
      title: moduleQuery.data?.name ? `Buổi học – ${moduleQuery.data.name}` : "Buổi học",
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Modules", href: "/admin/modules" },
        { label: moduleQuery.data?.name || `Module ${moduleId ?? ""}` },
      ],
    });
    return () => {
      resetHeader();
    };
  }, [moduleId, moduleQuery.data?.name, resetHeader, updateHeader]);

  const toggleSort = (key: 'title' | 'id') => {
    setCurrentPage(0);
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDelete = (id: number) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget == null) return;
    await deleteMutation.mutateAsync(deleteTarget);
  };

  const filteredSessions = useMemo<SessionDetailDTO[]>(() => {
    const sessions = sessionsQuery.data?.content ?? [];
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((session: SessionDetailDTO) =>
      session.title?.toLowerCase().includes(keyword)
    );
  }, [searchTerm, sessionsQuery.data?.content]);

  const totalElements = sessionsQuery.data?.totalElements ?? 0;
  const totalPages = sessionsQuery.data?.totalPages ?? 0;
  const displayedCount = filteredSessions.length;

  const handleCreate = async (data: { title: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => {
    setCreateError(null);
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (id: number, data: { title?: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => {
    await updateMutation.mutateAsync({ id, data });
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <div className="flex flex-1 min-w-[320px] items-center justify-end gap-3">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Tìm kiếm buổi học..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Thêm buổi học
          </button>
        </div>
      </div>

      {moduleQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Lỗi tải thông tin module: {(moduleQuery.error as any)?.message ?? "Không xác định"}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Sắp xếp theo:</span>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === 'id'
                  ? 'bg-teal-50 text-teal-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => toggleSort('id')}
            >
              STT {sortKey === 'id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === 'title'
                  ? 'bg-teal-50 text-teal-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => toggleSort('title')}
            >
              Tiêu đề {sortKey === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <span>Kích thước trang</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={pageSize}
                onChange={(event) => {
                  const newSize = Number(event.target.value);
                  setPageSize(newSize);
                  setCurrentPage(0);
                }}
              >
                {[10, 20, 50].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 w-14 text-center">STT</th>
                <th className="px-4 py-2">Buổi số</th>
                <th className="px-4 py-2">Tiêu đề</th>
                <th className="px-4 py-2">Nội dung</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Lỗi tải danh sách buổi học: {(sessionsQuery.error as any)?.message ?? "Không xác định"}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => void sessionsQuery.refetch()}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                      >
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
              {sessionsQuery.isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <tr key={`session-skeleton-${index}`} className="rounded-xl bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="mx-auto h-4 w-8 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-60 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex w-full justify-end gap-2">
                        <div className="h-8 w-10 rounded bg-slate-200 animate-pulse" />
                        <div className="h-8 w-10 rounded bg-slate-200 animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    {sessionsQuery.data?.content?.length
                      ? 'Không tìm thấy buổi học phù hợp.'
                      : 'Chưa có buổi học nào.'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s: SessionDetailDTO, index: number) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer rounded-xl bg-slate-50/60 text-sm text-slate-700 hover:bg-slate-100/80"
                  >
                    <td className="px-4 py-3 text-center text-slate-600">{currentPage * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.sessionNumber || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="line-clamp-2">{s.title || 'Chưa đặt tiêu đề'}</span>
                    </td>
                    <td className="max-w-xl px-4 py-3 text-slate-600">
                      {s.content ? (
                        <span className="line-clamp-2 leading-relaxed">{s.content}</span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có nội dung</span>
                      )}
                    </td>
                    <td className="rounded-r-xl px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSession(s)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-500 transition-colors hover:bg-rose-50"
                          title="Xóa"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {displayedCount} / {totalElements} buổi học
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
              Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setCurrentPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
              disabled={currentPage + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => {
            setShowCreateModal(false);
            setCreateError(null);
          }}
          onSave={handleCreate}
          error={createError}
          isLoading={createMutation.isPending}
        />
      )}

      {selectedSession && (
        <EditSessionModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSave={(d) => handleUpdate(selectedSession.id, d)}
        />
      )}

      {deleteTarget !== null && (
        <Transition appear show as={Fragment}>
          <Dialog
            as="div"
            className="relative z-[1000]"
            onClose={() => {
              if (!deleteMutation.isPending) setDeleteTarget(null);
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
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center px-4 py-6 text-center">
                <TransitionChild
                  as={Fragment}
                  enter="ease-out duration-200 transition-all"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-150 transition-all"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                      Xóa buổi học
                    </DialogTitle>
                    <p className="mt-2 text-sm text-slate-600">
                      Bạn có chắc muốn xóa buổi học này?
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deleteMutation.isPending}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={confirmDelete}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang xóa...
                          </>
                        ) : (
                          "Xóa"
                        )}
                      </button>
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

function CreateSessionModal({
  onClose,
  onSave,
  error,
  isLoading,
}: {
  onClose: () => void;
  onSave: (data: { title: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => void;
  error?: string | null;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({ title: '', content: '', sessionNumber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      title: formData.title,
      content: formData.content || undefined,
      sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined,
    });
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h2" className="text-xl font-semibold text-slate-900 mb-4">
                  Tạo buổi học mới
                </DialogTitle>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Tiêu đề <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.title ? 'border-rose-500' : 'border-slate-200'}`}
            />
            {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Nội dung</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              rows={5}
              disabled={isLoading}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Buổi số <span className="text-rose-500">*</span></label>
            <input
              type="number"
              value={formData.sessionNumber}
              onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isLoading ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function EditSessionModal({
  session,
  onClose,
  onSave,
}: {
  session: SessionDetailDTO;
  onClose: () => void;
  onSave: (data: { title?: string; content?: string; sessionNumber?: number; scheduledAt?: string }) => void;
}) {
  const [formData, setFormData] = useState({
    title: session.title,
    content: session.content || '',
    sessionNumber: String(session.sessionNumber || ''),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      title: formData.title,
      content: formData.content || undefined,
      sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined,
    });
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h2" className="text-xl font-semibold text-slate-900 mb-4">
                  Chỉnh sửa buổi học
                </DialogTitle>
                <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Tiêu đề <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.title ? 'border-rose-500' : 'border-slate-200'}`}
            />
            {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Nội dung</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              rows={5}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Buổi số</label>
            <input
              type="number"
              value={formData.sessionNumber}
              onChange={(e) => setFormData({ ...formData, sessionNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Lưu
            </button>
          </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

