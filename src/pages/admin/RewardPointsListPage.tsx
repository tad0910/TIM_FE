import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Search } from "lucide-react";
import NotificationPopup from "../../components/NotificationPopup";
import TableSkeleton from "../../components/TableSkeleton";
import { useNotification } from "../../hooks/useNotification";
import {
  useCreateRewardPointTypeMutation,
  useDeleteRewardPointTypeMutation,
  useRewardPointTypeDetail,
  useRewardPointTypesList,
  useUpdateRewardPointTypeMutation,
  type RewardPointTypeWithCreator,
} from "../../hooks/api/useRewardPointTypes";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import { useAuthStore } from "../../store/useAuthStore";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  try {
    const date = new Date(value);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

type UpdateRewardPointTypeFormState = {
  name: string;
  description: string;
  maxPoints: number;
  isActive: boolean;
  showOnDashboard: boolean;
  imageUrl?: string;
  createdBy?: number;
};

type UpdateRewardPointTypeFormValues = {
  data: UpdateRewardPointTypeFormState;
  imageFile?: File | null;
};

export default function RewardPointsListPage() {
  const { notification, showSuccess, showApiError, hideNotification } = useNotification();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page"));
  const sizeParam = Number(searchParams.get("size"));
  const page = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : PAGE_SIZE_OPTIONS[0];
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<"id" | "name">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { updateHeader, resetHeader } = useAdminHeader();

  const handleRowSelect = useCallback(
    (pointId: number) => (event: React.MouseEvent<HTMLTableRowElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) {
        return;
      }
      setEditId(pointId);
    },
    [],
  );

  useEffect(() => {
    updateHeader({
      title: "Danh sách điểm thưởng",
      breadcrumbs: [
        { label: "Quản trị", href: "/admin/dashboard" },
        { label: "Gamification", href: "/admin/gamification" },
        { label: "Điểm thưởng" },
      ],
    });

    return () => {
      resetHeader();
    };
  }, [resetHeader, updateHeader]);

  const { data, isLoading, isFetching, refetch } = useRewardPointTypesList({ page, size: pageSize });
  const list = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const defaultCreateValues = useMemo<UpdateRewardPointTypeFormState>(() => ({
    name: "",
    description: "",
    maxPoints: 0,
    isActive: true,
    showOnDashboard: true,
    imageUrl: undefined,
    createdBy: user?.id ? Number(user.id) : undefined,
  }), [user?.id]);

  const changeParams = useCallback(
    (nextPage: number, nextSize: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(nextPage));
      params.set("size", String(nextSize));
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handlePageChange = (nextPage: number) => {
    changeParams(nextPage, pageSize);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value);
    changeParams(0, nextSize);
  };

  const handleSort = (key: "id" | "name") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const filteredList = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return list.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword) ||
        String(item.id).includes(keyword);
      return matchesKeyword;
    });
  }, [list, searchTerm]);

  const sortedList = useMemo(() => {
    const comparator = sortKey === "id"
      ? (a: RewardPointTypeWithCreator, b: RewardPointTypeWithCreator) => (a.id - b.id)
      : (a: RewardPointTypeWithCreator, b: RewardPointTypeWithCreator) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    const ordered = [...filteredList].sort(comparator);
    return sortDir === "asc" ? ordered : ordered.reverse();
  }, [filteredList, sortDir, sortKey]);

  const activePoint = useMemo(() => list.find((point) => point.id === editId) ?? null, [list, editId]);

  const { data: editDetail, isLoading: loadingDetail } = useRewardPointTypeDetail(editId, {
    enabled: editId != null,
  });

  const updateMutation = useUpdateRewardPointTypeMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã cập nhật loại điểm thưởng");
      setEditId(null);
      refetch();
    },
    onError: (error) => {
      showApiError(error, "Không thể cập nhật loại điểm thưởng");
    },
  });

  const deleteMutation = useDeleteRewardPointTypeMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã xóa loại điểm thưởng");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      showApiError(error, "Không thể xóa loại điểm thưởng");
    },
  });

  const createMutation = useCreateRewardPointTypeMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã tạo loại điểm thưởng");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      showApiError(error, "Không thể tạo loại điểm thưởng");
    },
  });

  const handleDelete = () => {
    if (deleteId == null || deleteMutation.isPending) return;
    deleteMutation.mutate({ id: deleteId });
  };

  const handleSubmitEdit = (values: UpdateRewardPointTypeFormValues) => {
    if (editId == null || updateMutation.isPending) return;
    updateMutation.mutate({ id: editId, data: values.data, imageFile: values.imageFile ?? undefined });
  };

  const handleSubmitCreate = (values: UpdateRewardPointTypeFormValues) => {
    if (createMutation.isPending) return;
    createMutation.mutate({
      data: {
        ...values.data,
        createdBy: values.data.createdBy ?? (user?.id ? Number(user.id) : undefined),
      },
      imageFile: values.imageFile ?? undefined,
    });
  };

  const handleToggleStatus = useCallback(
    (point: RewardPointTypeWithCreator, field: "isActive" | "showOnDashboard") => {
      if (updateMutation.isPending) return;
      const nextValue = field === "isActive" ? !point.isActive : !point.showOnDashboard;
      updateMutation.mutate({
        id: point.id,
        data: {
          name: point.name,
          description: point.description,
          maxPoints: point.maxPoints,
          imageUrl: point.imageUrl,
          isActive: field === "isActive" ? nextValue : point.isActive,
          showOnDashboard: field === "showOnDashboard" ? nextValue : point.showOnDashboard,
        },
      });
    },
    [updateMutation],
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full max-w-sm sm:max-w-xs md:w-auto md:min-w-[280px] md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              changeParams(0, pageSize);
            }}
            placeholder="Tìm kiếm loại điểm"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <PlusIcon className="h-5 w-5" />
          Thêm loại điểm
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <span>Sắp xếp theo:</span>
          {([
            { key: "id", label: "STT" },
            { key: "name", label: "Tên" },
          ] as const).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSort(option.key)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                sortKey === option.key
                  ? "border-teal-200 bg-teal-50 text-teal-600"
                  : "border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option.label} {sortKey === option.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Kích thước trang</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                  <option key={sizeOption} value={sizeOption}>
                    {sizeOption}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && !data ? (
            <div className="px-5 py-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : sortedList.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Không có loại điểm phù hợp.</div>
          ) : (
            <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-16 px-4 py-2 text-center">STT</th>
                  <th className="px-4 py-2">Thông tin</th>
                  <th className="px-4 py-2">Người tạo</th>
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-4 py-2">Ngày tạo</th>
                  <th className="px-4 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((pointType, index) => (
                  <tr
                    key={pointType.id}
                    onClick={handleRowSelect(pointType.id)}
                    className="cursor-pointer rounded-xl bg-slate-50/70 text-sm text-slate-700 transition hover:bg-teal-50"
                  >
                    <td className="rounded-l-xl px-4 py-3 text-center text-slate-500">{page * pageSize + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <RewardPointThumbnail src={pointType.imageUrl} alt={pointType.name} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{pointType.name}</div>
                          {pointType.description && (
                            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{pointType.description}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-400">ID: {pointType.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{pointType.creatorName ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleStatus(pointType, "isActive");
                          }}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                            pointType.isActive
                              ? "border-teal-200 bg-teal-50 text-teal-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                          disabled={updateMutation.isPending}
                        >
                          {pointType.isActive ? "Đang kích hoạt" : "Đã tắt"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleStatus(pointType, "showOnDashboard");
                          }}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                            pointType.showOnDashboard
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                          disabled={updateMutation.isPending}
                        >
                          {pointType.showOnDashboard ? "Hiển thị Dashboard" : "Ẩn Dashboard"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(pointType.createdAt)}</td>
                    <td className="rounded-r-xl px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteId(pointType.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 transition hover:bg-rose-50"
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span>{isFetching ? "Đang cập nhật dữ liệu..." : `Hiển thị ${sortedList.length} / ${totalElements} loại điểm thưởng`}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (page > 0) handlePageChange(page - 1);
              }}
              disabled={page === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (page + 1 < totalPages) handlePageChange(page + 1);
              }}
              disabled={page + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <DeleteRewardPointDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        isSubmitting={deleteMutation.isPending}
      />

      <RewardPointFormDialog
        mode="edit"
        open={editId != null}
        point={editDetail ?? activePoint}
        isLoading={loadingDetail}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditId(null)}
        onSubmit={handleSubmitEdit}
      />

      <RewardPointFormDialog
        mode="create"
        open={isCreateOpen}
        point={null}
        isLoading={false}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleSubmitCreate}
        defaultValues={defaultCreateValues}
      />

      {notification && <NotificationPopup notification={notification} onClose={hideNotification} />}
    </div>
  );
}

function RewardPointThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
        No Image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
      onError={(event) => {
        const target = event.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://via.placeholder.com/64?text=No+Image";
      }}
    />
  );
}

interface RewardPointFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  point: RewardPointTypeWithCreator | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateRewardPointTypeFormValues) => void;
  defaultValues?: UpdateRewardPointTypeFormState;
}

function RewardPointFormDialog({
  open,
  mode,
  point,
  isLoading,
  isSubmitting,
  onClose,
  onSubmit,
  defaultValues,
}: RewardPointFormDialogProps) {
  const baseState = useMemo<UpdateRewardPointTypeFormState>(() => (
    defaultValues ?? {
      name: "",
      description: "",
      maxPoints: 0,
      isActive: true,
      showOnDashboard: true,
      imageUrl: undefined,
    }
  ), [defaultValues]);
  const [formState, setFormState] = useState<UpdateRewardPointTypeFormState>(baseState);
  const [maxPointsInput, setMaxPointsInput] = useState(String(baseState.maxPoints ?? 0));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>(baseState.imageUrl ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

  const isCreate = mode === "create";

  const resetState = useCallback(
    (nextState?: UpdateRewardPointTypeFormState) => {
      const targetState = nextState ?? baseState;
      setFormState(targetState);
      setMaxPointsInput(String(targetState.maxPoints ?? 0));
      setSelectedFile(null);
      setExistingImageUrl(targetState.imageUrl ?? "");
      setNameError(null);
    },
    [baseState],
  );

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (isCreate) {
      resetState(baseState);
      return;
    }

    if (!point) {
      resetState();
      return;
    }

    resetState({
      name: point.name,
      description: point.description ?? "",
      maxPoints: point.maxPoints ?? 0,
      isActive: point.isActive ?? true,
      showOnDashboard: point.showOnDashboard ?? true,
      imageUrl: point.imageUrl ?? undefined,
      createdBy: point.createdBy ?? undefined,
    });
  }, [baseState, isCreate, open, point, resetState]);

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setNameError("Vui lòng nhập tên điểm");
      return;
    }
    setNameError(null);
    onSubmit({
      data: {
        name: formState.name,
        description: formState.description,
        maxPoints: formState.maxPoints,
        isActive: formState.isActive,
        showOnDashboard: formState.showOnDashboard,
        imageUrl: !selectedFile && existingImageUrl ? existingImageUrl : undefined,
      },
      imageFile: selectedFile,
    });
  };

  const handleToggle = (field: "isActive" | "showOnDashboard", value: boolean) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleMaxPointsChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setMaxPointsInput(value);
      const numericValue = value === "" ? 0 : parseInt(value, 10);
      if (!Number.isNaN(numericValue)) {
        setFormState((prevState) => ({ ...prevState, maxPoints: numericValue }));
      }
    }
  };

  const handleMaxPointsBlur = (value: string) => {
    if (value === "" || value === "0") {
      setMaxPointsInput("0");
      setFormState((prevState) => ({ ...prevState, maxPoints: 0 }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  if (!open) {
    return null;
  }

  if (!isCreate && !point) {
    return (
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-[120]" onClose={() => !isSubmitting && onClose()}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
                <div className="text-sm text-slate-500">{isLoading ? "Đang tải dữ liệu..." : "Không tìm thấy thông tin loại điểm."}</div>
                <button
                  type="button"
                  onClick={() => !isSubmitting && onClose()}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Đóng
                </button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    );
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[120]"
        onClose={() => {
          if (!isSubmitting) {
            onClose();
          }
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
          <div className="fixed inset-0 bg-slate-900/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                <form onSubmit={submitForm} className="flex flex-col gap-6 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-lg font-semibold text-slate-900">
                        {isCreate ? "Thêm loại điểm thưởng" : "Chỉnh sửa loại điểm"}
                      </DialogTitle>
                      {!isCreate && point && <p className="mt-1 text-sm text-slate-500">{point.name}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => !isSubmitting && onClose()}
                      className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:text-slate-600"
                    >
                      <span className="sr-only">Đóng</span>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} fill="none">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Tên điểm *</label>
                      <input
                        value={formState.name}
                        onChange={(event) => setFormState((prevState) => ({ ...prevState, name: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        placeholder="Nhập tên điểm"
                      />
                      {nameError && <div className="mt-1 text-xs text-rose-600">{nameError}</div>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Mô tả</label>
                      <textarea
                        value={formState.description}
                        onChange={(event) => setFormState((prevState) => ({ ...prevState, description: event.target.value }))}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        placeholder="Mô tả ngắn gọn"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Điểm tối đa</label>
                      <input
                        value={maxPointsInput}
                        onChange={(event) => handleMaxPointsChange(event.target.value)}
                        onBlur={(event) => handleMaxPointsBlur(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Trạng thái</label>
                      <div className="mt-2 flex gap-2">
                        <ToggleButton active={formState.isActive} label="ON" onClick={() => handleToggle("isActive", true)} />
                        <ToggleButton active={!formState.isActive} label="OFF" onClick={() => handleToggle("isActive", false)} />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Dashboard</label>
                      <div className="mt-2 flex gap-2">
                        <ToggleButton
                          active={formState.showOnDashboard}
                          label="Hiển thị"
                          onClick={() => handleToggle("showOnDashboard", true)}
                        />
                        <ToggleButton
                          active={!formState.showOnDashboard}
                          label="Ẩn"
                          onClick={() => handleToggle("showOnDashboard", false)}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Hình ảnh</label>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          Chọn file
                        </label>
                        <span className="text-xs text-slate-500">
                          {selectedFile ? selectedFile.name : existingImageUrl ? "Đang sử dụng ảnh hiện tại" : "Chưa chọn file"}
                        </span>
                        {existingImageUrl && !selectedFile && (
                          <a href={existingImageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:underline">
                            Xem ảnh
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => !isSubmitting && onClose()}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      disabled={isSubmitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Đang lưu..." : isCreate ? "Tạo mới" : "Lưu thay đổi"}
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

function DeleteRewardPointDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[110]"
        onClose={() => {
          if (!isSubmitting) onClose();
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
          <div className="fixed inset-0 bg-slate-900/40" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200 transition-all"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150 transition-all"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <DialogTitle className="text-lg font-semibold text-slate-900">Xóa loại điểm</DialogTitle>
              <p className="mt-2 text-sm text-slate-600">
                Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa loại điểm thưởng này?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !isSubmitting && onClose()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-rose-700 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-teal-500 bg-teal-50 text-teal-600" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

