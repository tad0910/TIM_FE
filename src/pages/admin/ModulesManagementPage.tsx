import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import type { Module } from "../../types/module";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import { useAdminModules, useAdminModuleMutations } from "../../hooks/useAdminModules";

export default function ModulesManagementPage() {
  const navigate = useNavigate();
  const { updateHeader, resetHeader } = useAdminHeader();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<"id" | "name">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);
  const { notification, showSuccess, hideNotification, showApiError } = useNotification();

  useEffect(() => {
    updateHeader({
      title: "Module",
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Module" },
      ],
    });

    return () => {
      resetHeader();
    };
  }, [resetHeader, updateHeader]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, sortKey, sortDir, pageSize]);

  const toggleSort = (key: "id" | "name") => {
    setCurrentPage(0);
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const modulesQueryParams = useMemo(
    () => ({
      page: currentPage,
      size: pageSize,
      sort: `${sortKey},${sortDir}`,
      keyword: debouncedSearch || undefined,
    }),
    [currentPage, pageSize, sortKey, sortDir, debouncedSearch]
  );

  const {
    data: modulesData,
    isLoading,
    isPlaceholderData,
    isError,
    error,
    refetch,
  } = useAdminModules(modulesQueryParams);

  const { createModuleMutation, updateModuleMutation, deleteModuleMutation } =
    useAdminModuleMutations(modulesQueryParams);

  const creating = createModuleMutation.isPending;
  const updating = updateModuleMutation.isPending;
  const deleting = deleteModuleMutation.isPending;

  const modules = modulesData?.content || [];
  const totalPages = modulesData?.totalPages || 0;
  const totalElements = modulesData?.totalElements || 0;
  const loadingState = isLoading && !isPlaceholderData;
  const initialLoading = isLoading && !modulesData && !isPlaceholderData;

  const handleDelete = (id: number) => {
    const m = modules.find((x: Module) => x.id === id) || null;
    setDeleteTarget(m);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModuleMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess("Xóa module", "Module đã được xóa.");
    } catch (e: any) {
      showApiError(e, "Không thể xóa module. Vui lòng thử lại.", "Lỗi xóa module");
    }
  };

  const handleCreate = async (data: {
    name: string;
    description?: string;
    position?: number;
  }) => {
    try {
      await createModuleMutation.mutateAsync(data);
      setShowCreateModal(false);
      showSuccess("Tạo module", "Module mới đã được thêm.");
    } catch (e: any) {
      showApiError(e, "Không thể tạo module. Vui lòng thử lại.", "Lỗi tạo module");
    }
  };

  const handleUpdate = async (
    id: number,
    data: { name?: string; description?: string; position?: number }
  ) => {
    try {
      await updateModuleMutation.mutateAsync({ id, data });
      setSelectedModule(null);
      showSuccess("Cập nhật module", "Thông tin module đã được cập nhật.");
    } catch (e: any) {
      showApiError(
        e,
        "Không thể cập nhật module. Vui lòng thử lại.",
        "Lỗi cập nhật module"
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const renderDeleteDialog = () => {
    if (!deleteTarget) return null;

    const content = (
      <Transition appear show as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[1000]"
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
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
                    Xóa module
                  </DialogTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    Bạn có chắc muốn xóa module "{deleteTarget.name}"?
                  </p>
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => !deleting && setDeleteTarget(null)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleting}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang xóa...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Xóa
                        </>
                      )}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    );

    if (typeof document === "undefined") {
      return content;
    }

    return createPortal(content, document.body);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full max-w-sm sm:max-w-xs md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm kiếm module"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Tạo module mới
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Sắp xếp theo:</span>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === "id"
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => toggleSort("id")}
            >
              STT {sortKey === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === "name"
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => toggleSort("name")}
            >
              Tên {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
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

        {isError && !modulesData ? (
          <div className="px-5 py-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Lỗi tải danh sách module: {error?.message ?? "Không xác định"}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : null}

        <div className="relative overflow-hidden">
          <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 w-14 text-center">STT</th>
                <th className="px-4 py-2">Tên module</th>
                <th className="px-4 py-2">Mô tả</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isError && modulesData ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Lỗi tải dữ liệu mới, đang hiển thị dữ liệu cache.
                    </div>
                  </td>
                </tr>
              ) : null}
              {initialLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <tr key={`module-skeleton-${index}`} className="rounded-xl bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="mx-auto h-4 w-8 rounded bg-slate-200 animate-pulse" />
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
              ) : loadingState ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <tr key={`module-loading-${index}`} className="rounded-xl bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="mx-auto h-4 w-8 rounded bg-slate-200 animate-pulse" />
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
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    {debouncedSearch ? "Không tìm thấy module phù hợp." : "Chưa có module nào."}
                  </td>
                </tr>
              ) : (
                modules.map((module: Module, index: number) => (
                  <tr
                    key={module.id}
                    className="cursor-pointer rounded-xl bg-slate-50/60 text-sm text-slate-700 hover:bg-slate-100/80"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button")) {
                        return;
                      }
                      navigate(`/admin/modules/${module.id}/sessions`);
                    }}
                  >
                    <td className="px-4 py-3 text-center text-slate-600">{currentPage * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{module.name}</td>
                    <td className="max-w-xl px-4 py-3 text-slate-600">
                      {module.description ? (
                        <span className="line-clamp-2 leading-relaxed">{module.description}</span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có mô tả</span>
                      )}
                    </td>
                    <td className="rounded-r-xl px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedModule(module)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(module.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-500 transition-colors hover:bg-rose-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
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
            Hiển thị {modules.length} / {totalElements} module
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setCurrentPage((prev) => {
                  const next = Math.max(prev - 1, 0);
                  if (next !== prev) {
                    handlePageChange(next);
                  }
                  return next;
                })
              }
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
              onClick={() => {
                const next = currentPage + 1;
                if (next < totalPages) {
                  setCurrentPage(next);
                  handlePageChange(next);
                }
              }}
              disabled={currentPage + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {showCreateModal && (
        <CreateModuleModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          submitting={creating}
        />
      )}

      {selectedModule && (
        <EditModuleModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
          onSave={(data) => handleUpdate(selectedModule.id, data)}
          submitting={updating}
        />
      )}

      {renderDeleteDialog()}

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}

function CreateModuleModal({
  onClose,
  onSave,
  submitting,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    position?: number;
  }) => Promise<void> | void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    position: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      position: "",
    });
    setErrors({});
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên module";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const normalizedPosition = formData.position.trim();
    await onSave({
      name: formData.name.trim(),
      description: formData.description.trim()
        ? formData.description.trim()
        : undefined,
      position: normalizedPosition ? Number(normalizedPosition) : undefined,
    });
    resetForm();
  };

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={handleClose}>
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                    Tạo module mới
                  </DialogTitle>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    Đóng
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Tên module <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.name ? "border-rose-400" : "border-slate-200"
              }`}
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={submitting}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Mô tả
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo
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

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}

function EditModuleModal({
  module,
  onClose,
  onSave,
  submitting,
}: {
  module: Module;
  onClose: () => void;
  onSave: (data: { name?: string; description?: string }) => Promise<void> | void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: module.name,
    description: module.description || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      name: module.name,
      description: module.description || "",
    });
    setErrors({});
  }, [module.description, module.name]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên module";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    await onSave({
      name: formData.name.trim(),
      description: formData.description.trim()
        ? formData.description.trim()
        : undefined,
    });
  };

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={handleClose}>
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                    Chỉnh sửa module
                  </DialogTitle>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    Đóng
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Tên module <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.name ? "border-rose-400" : "border-slate-200"
              }`}
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={submitting}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Mô tả
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
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

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
