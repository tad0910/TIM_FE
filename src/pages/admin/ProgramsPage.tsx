import { Fragment, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, Layers, BookOpenCheck, RefreshCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { useAdminPrograms, useAdminProgramMutations } from "../../hooks/useAdminPrograms";
import type { Program } from "../../types/program";
import NotificationPopup from "../../components/NotificationPopup";
import type { Notification } from "../../components/NotificationPopup";
import { useNavigate } from "react-router-dom";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";

interface ProgramFormValues {
  name: string;
  description?: string;
}

const pageSizeOptions = [10, 20, 50];

export default function ProgramsPage() {
  const { updateHeader, resetHeader } = useAdminHeader();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortKey, setSortKey] = useState<"name" | "id">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [keyword, setKeyword] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const navigate = useNavigate();

  const params = useMemo(
    () => ({
      page,
      size,
      sort: `${sortKey},${sortDir}`,
      keyword,
    }),
    [keyword, page, size, sortDir, sortKey]
  );

  const { data, isLoading, error } = useAdminPrograms(params);
  const { createProgramMutation, updateProgramMutation, deleteProgramMutation } =
    useAdminProgramMutations(params);

  const programs = data?.content ?? [];

  const totalElements = data?.totalElements ?? programs.length;
  const totalPages = data?.totalPages ?? 1;

  const isInitialLoading = isLoading && !data;

  const isMutating =
    createProgramMutation.isPending ||
    updateProgramMutation.isPending ||
    deleteProgramMutation.isPending;

  useEffect(() => {
    updateHeader({
      title: "Chương trình đào tạo",
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Chương trình" },
      ],
    });

    return () => resetHeader();
  }, [resetHeader, updateHeader]);

  const handleToggleSort = (key: "name" | "id") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const handleCreateProgram = async (values: ProgramFormValues) => {
    try {
      await createProgramMutation.mutateAsync(values);
      setCreateModalOpen(false);
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: "Đã tạo chương trình học.",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Không thành công",
        message: "Không thể tạo chương trình học.",
        duration: 4000,
      });
    }
  };

  const handleUpdateProgram = async (values: ProgramFormValues) => {
    if (!editTarget) return;
    try {
      await updateProgramMutation.mutateAsync({
        id: editTarget.id,
        data: values,
      });
      setEditTarget(null);
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: "Đã cập nhật chương trình học.",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Không thành công",
        message: "Không thể cập nhật chương trình học.",
        duration: 4000,
      });
    }
  };

  const handleDeleteProgram = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProgramMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: "Đã xóa chương trình học.",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Không thành công",
        message: "Không thể xóa chương trình học.",
        duration: 4000,
      });
    }
  };

  const errorMessage =
    error instanceof Error ? error.message : error ? "Không thể tải danh sách." : null;

  const totalModules = useMemo(
    () => programs.reduce((sum, program) => sum + (program.modules?.length ?? 0), 0),
    [programs]
  );
  const averageModules = totalElements ? (totalModules / totalElements).toFixed(1) : "0.0";
  const keywordActive = searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Tổng chương trình"
          value={totalElements}
          icon={Layers}
          tone="teal"
        />
        <StatCard
          label="Tổng số module"
          value={totalModules}
          icon={BookOpenCheck}
          tone="slate"
        />
        <StatCard
          label="Module/trung bình"
          value={averageModules}
          icon={RefreshCcw}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full max-w-sm sm:max-w-xs md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm kiếm chương trình..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(0);
              setKeyword(event.target.value);
            }}
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => setCreateModalOpen(true)}
          disabled={isMutating}
        >
          <Plus className="h-4 w-4" />
          Thêm chương trình
        </button>
      </div>
      {keywordActive && (
        <div className="text-xs text-teal-700 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1">
          Đang lọc từ khóa "{searchTerm.trim()}"
          <button
            type="button"
            className="text-teal-600 hover:text-teal-800"
            onClick={() => {
              setSearchTerm("");
              setKeyword("");
              setPage(0);
            }}
          >
            Xóa
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Sắp xếp:</span>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                sortKey === "id"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => handleToggleSort("id")}
            >
              STT {sortKey === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                sortKey === "name"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => handleToggleSort("name")}
            >
              Tên {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Kích thước</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={size}
              onChange={(event) => {
                const newSize = Number(event.target.value);
                setSize(newSize);
                setPage(0);
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 w-14">STT</th>
                <th className="px-4 py-2">Tên chương trình</th>
                <th className="px-4 py-2">Mô tả</th>
                <th className="px-4 py-2">Số module</th>
                <th className="px-4 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                Array.from({ length: Math.min(size, 6) }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="rounded-xl bg-slate-50/60">
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
                      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex w-full justify-end gap-2">
                        <div className="h-8 w-16 rounded bg-slate-200 animate-pulse" />
                        <div className="h-8 w-16 rounded bg-slate-200 animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    {keyword ? "Không tìm thấy chương trình phù hợp." : "Chưa có chương trình nào."}
                  </td>
                </tr>
              ) : (
                programs.map((program, index) => (
                  <tr
                    key={program.id}
                    className="cursor-pointer rounded-xl bg-slate-50/60 text-sm text-slate-700 hover:bg-slate-100/80"
                    onClick={() => navigate(`/admin/programs/${program.id}/modules`)}
                  >
                    <td className="px-4 py-3 text-center text-slate-600">{page * size + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{program.name}</td>
                    <td className="max-w-xl px-4 py-3 text-slate-600">
                      {program.description ? (
                        <span className="line-clamp-2 leading-relaxed">{program.description}</span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có mô tả</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{program.modules?.length ?? 0}</td>
                    <td className="rounded-r-xl px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditTarget(program);
                          }}
                          disabled={isMutating}
                        >
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(program);
                          }}
                          disabled={isMutating}
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

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {programs.length} / {totalElements} chương trình
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
              disabled={page + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <ProgramFormModal
        title="Thêm chương trình"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateProgram}
        submitting={createProgramMutation.isPending}
      />

      <ProgramFormModal
        title="Cập nhật chương trình"
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdateProgram}
        defaultValues={{
          name: editTarget?.name ?? "",
          description: editTarget?.description ?? "",
        }}
        submitting={updateProgramMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa chương trình"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ""}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProgram}
        loading={deleteProgramMutation.isPending}
      />

      <NotificationPopup notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "teal" | "slate" | "amber";
}

function StatCard({ label, value, icon: Icon, tone = "teal" }: StatCardProps) {
  const toneStyles = {
    teal: "bg-teal-50 text-teal-700",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface ProgramFormModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProgramFormValues) => Promise<void>;
  submitting?: boolean;
  defaultValues?: ProgramFormValues;
}

function ProgramFormModal({
  title,
  open,
  onClose,
  onSubmit,
  submitting,
  defaultValues,
}: ProgramFormModalProps) {
  const [form, setForm] = useState<ProgramFormValues>({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
  });
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setForm({
        name: defaultValues?.name ?? "",
        description: defaultValues?.description ?? "",
      });
      setErrors({});
    }
  }, [defaultValues?.description, defaultValues?.name, open]);

  const handleClose = () => {
    if (submitting) return;
    setForm(
      defaultValues ?? {
        name: "",
        description: "",
      }
    );
    setErrors({});
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Vui lòng nhập tên chương trình" });
      return;
    }
    setErrors({});
    await onSubmit({
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
    });
    setForm({ name: "", description: "" });
  };

  return (
    <Transition appear show={open} as={Fragment}>
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                  {title}
                </DialogTitle>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">
                      Tên chương trình <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        errors.name ? "border-rose-400" : "border-slate-200"
                      }`}
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      disabled={submitting}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Mô tả</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed"
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
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText: string;
  variant?: "danger" | "default";
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

function ConfirmDialog({
  title,
  description,
  confirmText,
  variant = "default",
  open,
  onClose,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  return (
    <Transition appear show={open} as={Fragment}>
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                  {title}
                </DialogTitle>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      variant === "danger"
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "bg-teal-600 text-white hover:bg-teal-700"
                    }`}
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {confirmText}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
