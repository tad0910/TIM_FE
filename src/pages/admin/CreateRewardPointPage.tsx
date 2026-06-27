import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";
import { useAuthStore } from "../../store/useAuthStore";
import {
  useCreateRewardPointTypeMutation,
  useRewardPointTypeDetail,
  useUpdateRewardPointTypeMutation,
} from "../../hooks/api/useRewardPointTypes";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";

type RewardPointFormState = {
  name: string;
  description?: string;
  maxPoints: number;
  isActive: boolean;
  showOnDashboard: boolean;
  createdBy?: number;
};

export default function CreateRewardPointPage() {
  const navigate = useNavigate();
  const { pointTypeId } = useParams<{ pointTypeId?: string }>();
  const { user } = useAuthStore();
  const { notification, showSuccess, showWarning, showApiError, hideNotification } = useNotification();
  const { updateHeader, resetHeader } = useAdminHeader();

  const isEdit = Boolean(pointTypeId);
  const editingId = pointTypeId ? Number(pointTypeId) : null;

  const headerTitle = isEdit ? "Chỉnh sửa loại điểm thưởng" : "Thêm loại điểm thưởng";

  React.useEffect(() => {
    updateHeader({
      title: headerTitle,
      breadcrumbs: [
        { label: "Quản trị", href: "/admin/dashboard" },
        { label: "Gamification", href: "/admin/gamification" },
        { label: "Điểm thưởng", href: "/admin/gamification/reward-points" },
        { label: isEdit ? "Chỉnh sửa" : "Thêm mới" },
      ],
    });

    return () => {
      resetHeader();
    };
  }, [headerTitle, isEdit, resetHeader, updateHeader]);

  const { data: detail, isLoading: loadingDetail } = useRewardPointTypeDetail(editingId, {
    enabled: isEdit && editingId != null,
  });

  const baseState: RewardPointFormState = useMemo(
    () => ({
      name: detail?.name ?? "",
      description: detail?.description ?? "",
      maxPoints: detail?.maxPoints ?? 0,
      isActive: detail?.isActive ?? true,
      showOnDashboard: detail?.showOnDashboard ?? true,
      createdBy: user?.id ? Number(user.id) : undefined,
    }),
    [detail?.description, detail?.isActive, detail?.maxPoints, detail?.name, detail?.showOnDashboard, user?.id],
  );

  const [formState, setFormState] = useState<RewardPointFormState>(baseState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>(detail?.imageUrl ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setFormState(baseState);
    setExistingImageUrl(detail?.imageUrl ?? "");
    setSelectedFile(null);
    setErrors({});
  }, [baseState, detail?.imageUrl]);

  const createMutation = useCreateRewardPointTypeMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã tạo loại điểm thưởng");
      navigate("/admin/gamification/reward-points");
    },
    onError: (error) => {
      showApiError(error, "Không thể tạo loại điểm thưởng");
    },
  });

  const updateMutation = useUpdateRewardPointTypeMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã cập nhật loại điểm thưởng");
      navigate("/admin/gamification/reward-points");
    },
    onError: (error) => {
      showApiError(error, "Không thể cập nhật loại điểm thưởng");
    },
  });

  const validating = () => {
    const nextErrors: Record<string, string> = {};
    if (!formState.name.trim()) {
      nextErrors.name = "Vui lòng nhập tên điểm";
    }
    if (formState.maxPoints < 0) {
      nextErrors.maxPoints = "Điểm tối đa không được âm";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validating()) {
      showWarning("Thiếu thông tin", "Vui lòng kiểm tra lại các trường bắt buộc");
      return;
    }

    const payload = {
      data: {
        name: formState.name,
        description: formState.description,
        maxPoints: formState.maxPoints,
        isActive: formState.isActive,
        showOnDashboard: formState.showOnDashboard,
        imageUrl: !selectedFile && existingImageUrl ? existingImageUrl : undefined,
        createdBy: formState.createdBy,
      },
      imageFile: selectedFile ?? undefined,
    };

    if (isEdit && editingId != null) {
      updateMutation.mutate({ id: editingId, data: payload.data, imageFile: payload.imageFile });
    } else {
      createMutation.mutate({ data: payload.data, imageFile: payload.imageFile });
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/admin/gamification/reward-points")}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Quay lại danh sách điểm thưởng
      </button>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loadingDetail ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Tên điểm *</label>
                <input
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="Nhập tên điểm"
                />
                {errors.name && <div className="mt-1 text-xs text-rose-600">{errors.name}</div>}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                  value={formState.description ?? ""}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="Mô tả ngắn gọn"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Điểm tối đa</label>
                <input
                  value={String(formState.maxPoints)}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      const numeric = value === "" ? 0 : Number(value);
                      setFormState((prev) => ({ ...prev, maxPoints: numeric }));
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                />
                {errors.maxPoints && <div className="mt-1 text-xs text-rose-600">{errors.maxPoints}</div>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                <ToggleGroup
                  value={formState.isActive}
                  onChange={(value) => setFormState((prev) => ({ ...prev, isActive: value }))}
                  activeLabel="ON"
                  inactiveLabel="OFF"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Dashboard</label>
                <ToggleGroup
                  value={formState.showOnDashboard}
                  onChange={(value) => setFormState((prev) => ({ ...prev, showOnDashboard: value }))}
                  activeLabel="Hiển thị"
                  inactiveLabel="Ẩn"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Hình ảnh</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                    Chọn file
                  </label>
                  <span className="text-xs text-slate-500">
                    {selectedFile ? selectedFile.name : existingImageUrl ? "Đang sử dụng ảnh hiện tại" : "Chưa chọn file"}
                  </span>
                  {existingImageUrl && !selectedFile && (
                    <a href={existingImageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:underline">
                      Xem ảnh hiện tại
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => navigate("/admin/gamification/reward-points")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </form>
        )}
      </section>

      {notification && <NotificationPopup notification={notification} onClose={hideNotification} />}
    </div>
  );
}

function ToggleGroup({
  value,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
          value ? "border-teal-500 bg-teal-50 text-teal-600" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        {activeLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
          !value ? "border-teal-500 bg-teal-50 text-teal-600" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        {inactiveLabel}
      </button>
    </div>
  );
}

