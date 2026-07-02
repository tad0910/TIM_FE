import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import useJobLeads from "../hooks/useJobLeads";
import useJobActivities from "../hooks/useJobActivities";
import useStudentJobSettings from "../hooks/useStudentJobSettings";
import type {
  CreateJobLeadPayload,
  JobActivity,
  JobActivityType,
  JobLead,
  JobLeadStatusCode,
} from "../types";
import { useNotification } from "../hooks/useNotification";
import NotificationPopup from "../components/NotificationPopup";
import LoadingSpinner from "../components/tuition/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";


type JobLeadWithMeta = JobLead & {
  createdLabel: string;
  statusDisplay: string;
  statusKey: JobLeadStatusCode | null;
};

type ActivityConfig = {
  label: string;
  contentPlaceholder: string;
  attachmentLabel: string;
  leadStatus: JobLeadStatusCode;
  showSalaryField?: boolean;
  salaryLabel?: string;
  salaryPlaceholder?: string;
};

const toLocalDatetimeInput = (date: Date = new Date()) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ACTIVITY_CONFIG: Record<JobActivityType, ActivityConfig> = {
  SEND_CV: {
    label: "Gửi CV",
    contentPlaceholder: "VD: Gửi CV bản tiếng Anh tới ABC...",
    attachmentLabel: "Đính kèm CV (png, jpg, pdf, ...)",
    leadStatus: "NEW",
  },
  INTERVIEW_SCHEDULED: {
    label: "Nhận lịch phỏng vấn",
    contentPlaceholder: "VD: Nhận lịch phỏng vấn vòng 1 vào 10h ngày 05/12...",
    attachmentLabel: "Đính kèm thư mời (tuỳ chọn)",
    leadStatus: "APPLIED",
  },
  INTERVIEW: {
    label: "Phỏng vấn",
    contentPlaceholder: "VD: Phỏng vấn vòng 2 với anh A, ghi chú...",
    attachmentLabel: "Đính kèm biên bản/phản hồi (tuỳ chọn)",
    leadStatus: "INTERVIEWING",
  },
  OFFER_RECEIVED: {
    label: "Nhận offer",
    contentPlaceholder: "Ghi chú các điều khoản offer...",
    attachmentLabel: "Đính kèm offer letter",
    showSalaryField: true,
    salaryLabel: "Mức offer",
    salaryPlaceholder: "Ví dụ: 12.000.000 VND",
    leadStatus: "OFFER",
  },
  PROBATION_CONTRACT: {
    label: "Ký hợp đồng thử việc",
    contentPlaceholder: "Thông tin về hợp đồng thử việc...",
    attachmentLabel: "Đính kèm hợp đồng thử việc",
    showSalaryField: true,
    salaryLabel: "Mức lương thử việc",
    salaryPlaceholder: "Ví dụ: 10.000.000 VND",
    leadStatus: "PROBATION",
  },
  OFFICIAL_CONTRACT: {
    label: "Ký hợp đồng chính thức",
    contentPlaceholder: "Ghi chú khi ký hợp đồng chính thức...",
    attachmentLabel: "Đính kèm hợp đồng chính thức",
    showSalaryField: true,
    salaryLabel: "Mức lương chính thức",
    salaryPlaceholder: "Ví dụ: 15.000.000 VND",
    leadStatus: "OFFICIAL",
  },
};

const ACTIVITY_TYPE_LABELS: Record<JobActivityType, string> = Object.entries(ACTIVITY_CONFIG).reduce(
  (acc, [key, config]) => ({ ...acc, [key as JobActivityType]: config.label }),
  {} as Record<JobActivityType, string>
);

const STATUS_COLORS: Record<JobLeadStatusCode, string> = {
  NEW: "bg-blue-100 text-blue-700",
  APPLIED: "bg-emerald-100 text-emerald-700",
  INTERVIEWING: "bg-amber-100 text-amber-700",
  OFFER: "bg-indigo-100 text-indigo-700",
  PROBATION: "bg-amber-100 text-amber-700",
  OFFICIAL: "bg-teal-100 text-teal-700",
  FAILED: "bg-red-100 text-red-700",
  IGNORED: "bg-gray-200 text-gray-600",
};

const activityTypeOptions: Array<{ value: JobActivityType; label: string }> = (
  Object.keys(ACTIVITY_CONFIG) as JobActivityType[]
).map((value) => ({ value, label: ACTIVITY_CONFIG[value].label }));

const formatDate = (value?: string | null) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value ?? "";
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return formatDate(value);
  }
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value ?? "";
  }
};

type ViteRuntimeEnv = {
  VITE_BASE_URL?: unknown;
};

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;

  let base = "";
  if (typeof process !== "undefined" && typeof process.env?.VITE_BASE_URL === "string") {
    base = process.env.VITE_BASE_URL;
  } else if (typeof globalThis !== "undefined") {
    const runtimeEnv = globalThis as ViteRuntimeEnv;
    const value = runtimeEnv.VITE_BASE_URL;
    if (typeof value === "string") {
      base = value;
    }
  }

  return `${base}${url}`;
};

const normalizeStatusCode = (value?: string | null): JobLeadStatusCode | null => {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return (Object.keys(STATUS_COLORS) as JobLeadStatusCode[]).includes(upper as JobLeadStatusCode)
    ? (upper as JobLeadStatusCode)
    : null;
};

const getActivityTimestamp = (activity: Pick<JobActivity, "happenedAt" | "createdAt">) => {
  const happened = activity.happenedAt ? Date.parse(activity.happenedAt) : Number.NaN;
  const created = activity.createdAt ? Date.parse(activity.createdAt) : Number.NaN;
  const happenedTs = Number.isNaN(happened) ? Number.NEGATIVE_INFINITY : happened;
  const createdTs = Number.isNaN(created) ? Number.NEGATIVE_INFINITY : created;
  return Math.max(happenedTs, createdTs);
};

const getStatusColor = (statusKey: JobLeadStatusCode | null) => {
  if (!statusKey) return "bg-gray-100 text-gray-700";
  return STATUS_COLORS[statusKey] ?? "bg-gray-100 text-gray-700";
};

const getActivityBadgeClass = (activityType: JobActivityType) => {
  const statusForActivity = ACTIVITY_CONFIG[activityType]?.leadStatus ?? null;
  return getStatusColor(statusForActivity);
};

export default function JobTrackingPage(): JSX.Element {
  const { leads, loading, error, refresh, createLead, deleteLead } = useJobLeads({
    refetchIntervalMs: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const navigate = useNavigate();
  const {
    jobInterestEnabled,
    loading: jobSettingsLoading,
    error: jobSettingsError,
    setJobInterestEnabled,
    updating: jobSettingsUpdating,
  } = useStudentJobSettings();
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activityType: "SEND_CV" as JobActivityType,
    content: "",
    happenedAt: toLocalDatetimeInput(),
    salaryAmount: "",
    file: null as File | null,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [noteModal, setNoteModal] = useState({
    open: false,
    activityId: null as number | null,
    note: "",
    saving: false,
  });

  const { notification, showSuccess, showWarning, showApiError, hideNotification } = useNotification();

  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    refresh: refreshActivities,
    createActivity,
    updateNote,
  } = useJobActivities(selectedLeadId, { autoLoad: Boolean(selectedLeadId) });

  const displayLeads = leads;
  const displayActivities = activities;

  const mappedLeads: JobLeadWithMeta[] = useMemo(
    () =>
      displayLeads.map((lead) => {
        const statusKey =
          normalizeStatusCode((lead.statusCode as string | null | undefined) ?? lead.status ?? null) ?? null;
        const statusDisplay = lead.statusLabel ?? lead.status ?? "";
        return {
          ...lead,
          statusKey: statusKey ?? null,
          statusDisplay,
          createdLabel: formatDate(lead.date),
        };
      }),
    [leads]
  );

  useEffect(() => {
    if (!selectedLeadId && displayLeads.length > 0) {
      setSelectedLeadId(displayLeads[0].id);
    }
    if (selectedLeadId && !displayLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(displayLeads[0]?.id ?? null);
    }
  }, [displayLeads, selectedLeadId]);

  useEffect(() => {
    if (!jobInterestEnabled) {
      setCreateModalOpen(false);
    }
  }, [jobInterestEnabled]);

  const selectedLead = mappedLeads.find((lead) => lead.id === selectedLeadId) ?? null;

  const hasLeads = mappedLeads.length > 0;

  const filteredLeads = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return mappedLeads;
    }
    return mappedLeads.filter((lead) => {
      const searchableValues = [
        lead.companyName,
        lead.shortName,
        lead.statusDisplay,
        lead.status ?? "",
        lead.address ?? "",
        lead.website ?? "",
      ];
      return searchableValues.some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [mappedLeads, searchTerm]);

  const noSearchResults = !loading && searchTerm.trim().length > 0 && filteredLeads.length === 0;

  const sortedActivities = useMemo(
    () => [...displayActivities].sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a)),
    [displayActivities]
  );

  const handleRefreshAll = async () => {
    await refresh();
    await refreshActivities();
  };

  const handleToggleJobInterest = useCallback(async () => {
    try {
      await setJobInterestEnabled(!jobInterestEnabled);
      showSuccess(
        jobInterestEnabled ? "Đã tắt nhu cầu tìm việc" : "Đã bật nhu cầu tìm việc",
        jobInterestEnabled
          ? "Bạn đã tạm dừng trạng thái tìm việc."
          : "Bạn đã bật trạng thái tìm việc."
      );
    } catch (err) {
      showApiError(err, "Không thể cập nhật trạng thái tìm việc");
    }
  }, [jobInterestEnabled, setJobInterestEnabled, showApiError, showSuccess]);

  const handleCreateLead = async (payload: CreateJobLeadPayload) => {
    if (!jobInterestEnabled) {
      showWarning(
        "Đang tắt chế độ tìm việc",
        "Bạn cần bật chế độ tìm việc để thêm đầu mối mới."
      );
      setCreateModalOpen(false);
      return;
    }
    const newLead = await createLead(payload);
    if (newLead) {
      showSuccess("Tạo đầu mối thành công", `Đã thêm ${newLead.companyName}.`);
      setCreateModalOpen(false);
      setSelectedLeadId(newLead.id);
      await refreshActivities();
    }
  };

  const handleDeleteLead = async (lead: JobLead) => {
    const confirmed = window.confirm(`Bạn chắc chắn muốn xóa đầu mối "${lead.companyName}"?`);
    if (!confirmed) return;
    const success = await deleteLead(lead.id);
    if (success) {
      showSuccess("Đã xóa đầu mối", `${lead.companyName} đã được xóa.`);
      setSelectedLeadId((current) => {
        if (current !== lead.id) {
          return current;
        }
        const remaining = leads.filter((item) => item.id !== lead.id);
        return remaining[0]?.id ?? null;
      });
    }
  };

  const resetActivityForm = () => {
    setActivityForm({
      activityType: "SEND_CV",
      content: "",
      happenedAt: toLocalDatetimeInput(),
      salaryAmount: "",
      file: null,
    });
  };

  const currentActivityType = activityForm.activityType;

  useEffect(() => {
    setActivityForm((prev) => {
      if (ACTIVITY_CONFIG[prev.activityType]?.showSalaryField || !prev.salaryAmount) {
        return prev;
      }
      return { ...prev, salaryAmount: "" };
    });
  }, [currentActivityType]);

  const handleSubmitActivity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeadId) {
      showWarning("Chưa chọn đầu mối", "Vui lòng chọn một đầu mối việc làm trước.");
      return;
    }
    if (!activityForm.content.trim()) {
      showWarning("Thiếu nội dung", "Vui lòng mô tả hoạt động.");
      return;
    }

    try {
      setActivitySubmitting(true);
      const happenedAtDate = activityForm.happenedAt.slice(0, 10);
      if (!happenedAtDate) {
        showWarning("Thiếu thời điểm", "Vui lòng chọn ngày ghi nhận.");
        return;
      }
      const created = await createActivity({
        jobLeadId: selectedLeadId,
        activityType: activityForm.activityType,
        content: activityForm.content.trim(),
        happenedAt: happenedAtDate,
        salaryAmount: activityForm.salaryAmount ? activityForm.salaryAmount : undefined,
        file: activityForm.file,
      });
      if (created) {
        showSuccess("Đã thêm hoạt động", ACTIVITY_TYPE_LABELS[created.activityType] ?? "Hoạt động mới");
        resetActivityForm();
        await Promise.all([refreshActivities(), refresh()]);
      }
    } catch (err) {
      showApiError(err, "Không thể tạo hoạt động");
    } finally {
      setActivitySubmitting(false);
    }
  };

  const openNoteModal = useCallback((activityId: number, currentNote?: string | null) => {
    setNoteModal({ open: true, activityId, note: currentNote ?? "", saving: false });
  }, []);

  const closeNoteModal = useCallback(() => {
    setNoteModal((prev) => ({ ...prev, open: false, activityId: null, note: "", saving: false }));
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!noteModal.activityId) return;
    try {
      setNoteModal((prev) => ({ ...prev, saving: true }));
      const updated = await updateNote({ activityId: noteModal.activityId, note: noteModal.note.trim() });
      if (updated) {
        showSuccess("Đã lưu ghi chú", "Ghi chú đã được cập nhật.");
      }
      closeNoteModal();
    } catch (err) {
      showApiError(err, "Không thể cập nhật ghi chú");
      setNoteModal((prev) => ({ ...prev, saving: false }));
    }
  }, [closeNoteModal, noteModal.activityId, noteModal.note, showApiError, showSuccess, updateNote]);

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setActivityForm((prev) => ({ ...prev, file: file ?? null }));
  };

  const currentActivityConfig = ACTIVITY_CONFIG[activityForm.activityType];

  const totalLeads = mappedLeads.length;
  const adminIntroductions = mappedLeads.filter((lead) => lead.isFromAdmin).length;
  const personalLeads = Math.max(totalLeads - adminIntroductions, 0);
  const offerLeads = mappedLeads.filter((lead) => (lead.status as JobLeadStatusCode) === "OFFER").length;

  const latestActivityInfo = useMemo(() => {
    if (!selectedLead) {
      return { value: "—", note: "Chọn đầu mối để xem nhật ký" };
    }
    if (!sortedActivities.length) {
      return { value: "—", note: "Chưa có nhật ký nào" };
    }
    const latestTimestamp = getActivityTimestamp(sortedActivities[0]);
    if (!Number.isFinite(latestTimestamp)) {
      return { value: "—", note: "Chưa có nhật ký nào" };
    }
    const diffMs = Date.now() - latestTimestamp;
    const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
    const value = diffDays === 0 ? "Hôm nay" : `${diffDays} ngày`;
    return { value, note: "Kể từ lần cập nhật cuối cùng" };
  }, [selectedLead, sortedActivities]);

  const headerStats = useMemo(
    () => [
      {
        label: "Tổng đầu mối",
        value: totalLeads,
        note: `${adminIntroductions} giới thiệu • ${personalLeads} tự tìm`,
      },
      {
        label: "Offer / HĐ",
        value: offerLeads,
        note: "Đầu mối đã có offer hoặc hợp đồng",
      },
      {
        label: "Nhật ký gần nhất",
        value: latestActivityInfo.value,
        note: latestActivityInfo.note,
      },
    ],
    [adminIntroductions, latestActivityInfo, offerLeads, personalLeads, totalLeads]
  );

  const leadCountLabel = loading
    ? "Đang tải..."
    : searchTerm.trim().length > 0
    ? `${filteredLeads.length}/${totalLeads} mục`
    : `${filteredLeads.length} mục`;

  return (
    <PageLayout
      title="Theo dõi đầu mối việc làm"
      description="Cập nhật tiến trình ứng tuyển, lưu trữ offer và chia sẻ nhật ký cho mentor. Ghi lại mọi hoạt động quan trọng để không bỏ lỡ cơ hội."
      headerRight={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleToggleJobInterest()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
              jobInterestEnabled
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
            }`}
            type="button"
            disabled={jobSettingsLoading || jobSettingsUpdating}
          >
            {jobSettingsLoading ? "Đang kiểm tra..." : jobInterestEnabled ? "Đang tìm việc: ON" : "Đang tìm việc: OFF"}
          </button>
          <button
            onClick={() => {
              if (!jobInterestEnabled) return;
              setCreateModalOpen(true);
            }}
            className={`inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#C2410C] disabled:opacity-60`}
            type="button"
            disabled={!jobInterestEnabled}
          >
            <span className="text-lg">＋</span>
            Thêm đầu mối
          </button>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {jobSettingsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {jobSettingsError}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {headerStats.map((chip) => (
            <div key={chip.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{chip.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#1E3A8A]">{chip.value}</p>
              <p className="mt-1 text-xs text-gray-500">{chip.note}</p>
            </div>
          ))}
        </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đầu mối của bạn</p>
                  <p className="text-sm text-gray-500">{leadCountLabel}</p>
                </div>
                <button
                  onClick={handleRefreshAll}
                  className="btn btn-outline btn-compact inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  type="button"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Làm mới
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên công ty, trạng thái..."
                  className="w-full border-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-[560px] space-y-2 overflow-y-auto px-5 pb-5 pt-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {!loading && !hasLeads && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  Bạn chưa có đầu mối việc làm nào. Hãy thêm đầu mối mới để bắt đầu theo dõi tiến trình.
                </div>
              )}

              {!loading && noSearchResults && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  Không tìm thấy đầu mối phù hợp với từ khóa "{searchTerm}".
                </div>
              )}

              {!loading && filteredLeads.length > 0 && (
                <ul className="space-y-3">
                  {filteredLeads.map((lead) => {
                    const isActive = lead.id === selectedLeadId;
                    const canDelete = !lead.isFromAdmin;
                    return (
                      <li key={lead.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                            isActive
                              ? "border-[#1E3A8A] bg-blue-50/50 shadow-sm"
                              : "border-transparent bg-white hover:border-gray-200 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div>
                                <p className="font-semibold text-gray-900">{lead.companyName}</p>
                                {lead.shortName && <p className="text-xs text-gray-500">{lead.shortName}</p>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {lead.address && <span>📍 {lead.address}</span>}
                                {lead.website && (
                                  <a
                                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                    className="text-indigo-600 hover:underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    🌐 Website
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs">
                              <span className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ${
                                lead.isFromAdmin
                                  ? "bg-blue-100 text-[#1E3A8A]"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {lead.isFromAdmin ? "Giới thiệu" : "Tự tìm"}
                              </span>
                              <span className="text-gray-500">{lead.createdLabel}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${getStatusColor(
                                lead.statusKey
                              )}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {lead.statusDisplay || "Chưa xác định"}
                            </span>
                            <div className="flex items-center gap-2">
                              {!canDelete && (
                                <span className="text-[11px] text-gray-400" title="Đầu mối do admin giới thiệu - hãy trao đổi với mentor nếu cần điều chỉnh">
                                  Không thể xóa
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!canDelete) return;
                                  void handleDeleteLead(lead);
                                }}
                                disabled={!canDelete}
                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                  canDelete
                                    ? "text-red-500 hover:bg-red-50"
                                    : "cursor-not-allowed text-gray-400"
                                }`}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {selectedLead ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiết đầu mối</p>
                    <h2 className="text-2xl font-semibold text-gray-900">{selectedLead.companyName}</h2>
                    {selectedLead.shortName && <p className="text-sm text-gray-500">{selectedLead.shortName}</p>}
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                      selectedLead.statusKey
                    )}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                    {selectedLead.statusDisplay || "Chưa xác định"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-gray-500">Nguồn đầu mối</p>
                    <p>{selectedLead.isFromAdmin ? "Admin giới thiệu" : "Sinh viên tự thêm"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Ngày ghi nhận</p>
                    <p>{selectedLead.createdLabel || "—"}</p>
                  </div>
                  {selectedLead.address && (
                    <div>
                      <p className="font-medium text-gray-500">Địa điểm</p>
                      <p>{selectedLead.address}</p>
                    </div>
                  )}
                  {selectedLead.website && (
                    <div>
                      <p className="font-medium text-gray-500">Website</p>
                      <p>
                        <a
                          href={selectedLead.website.startsWith("http") ? selectedLead.website : `https://${selectedLead.website}`}
                          className="text-indigo-600 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selectedLead.website}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6 px-6 py-6">
                <section>
                  <h3 className="text-lg font-semibold text-gray-900">Thêm hoạt động</h3>
                  <form onSubmit={handleSubmitActivity} className="mt-3 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col text-sm font-medium text-gray-700">
                        Loại hoạt động
                        <select
                          value={activityForm.activityType}
                          onChange={(event) =>
                            setActivityForm((prev) => ({
                              ...prev,
                              activityType: event.target.value as JobActivityType,
                            }))
                          }
                          className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        >
                          {activityTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col text-sm font-medium text-gray-700">
                        Thời điểm
                        <input
                          type="datetime-local"
                          value={activityForm.happenedAt}
                          onChange={(event) => setActivityForm((prev) => ({ ...prev, happenedAt: event.target.value }))}
                          className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                          required
                        />
                      </label>
                    </div>

                    <label className="flex flex-col text-sm font-medium text-gray-700">
                      Nội dung hoạt động
                      <textarea
                        value={activityForm.content}
                        onChange={(event) => setActivityForm((prev) => ({ ...prev, content: event.target.value }))}
                        rows={3}
                        placeholder={currentActivityConfig?.contentPlaceholder}
                        className="mt-2 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        required
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      {currentActivityConfig?.showSalaryField && (
                        <label className="flex flex-col text-sm font-medium text-gray-700">
                          {currentActivityConfig.salaryLabel}
                          <input
                            type="text"
                            value={activityForm.salaryAmount}
                            onChange={(event) => setActivityForm((prev) => ({ ...prev, salaryAmount: event.target.value }))}
                            placeholder={currentActivityConfig.salaryPlaceholder}
                            className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                          />
                        </label>
                      )}
                      <label className="flex flex-col text-sm font-medium text-gray-700">
                        {currentActivityConfig?.attachmentLabel ?? "Đính kèm (CV, offer...)"}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleSelectFile}
                          className="mt-2 text-sm text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetActivityForm}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        disabled={activitySubmitting}
                      >
                        Xóa nội dung
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                        disabled={activitySubmitting}
                      >
                        {activitySubmitting ? "Đang lưu..." : "Thêm hoạt động"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Nhật ký hoạt động</h3>
                    <button
                      onClick={refreshActivities}
                      className="btn btn-outline inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Làm mới
                    </button>
                  </div>

                  {activitiesError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {activitiesError}
                    </div>
                  )}

                  {activitiesLoading ? (
                    <div className="flex justify-center py-12">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      Chưa có hoạt động nào cho đầu mối này. Hãy thêm hoạt động đầu tiên.
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {activities.map((activity) => (
                        <li key={activity.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getActivityBadgeClass(
                                  activity.activityType
                                )}`}
                              >
                                <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                                {ACTIVITY_TYPE_LABELS[activity.activityType] ?? activity.activityType}
                              </span>
                              <p className="text-sm text-gray-700 whitespace-pre-line">{activity.content}</p>
                            </div>
                            <div className="space-y-1 text-right text-xs text-gray-500">
                              <p>Ghi nhận: {formatDateTime(activity.happenedAt) || "—"}</p>
                              <p>Tạo lúc: {formatDateTime(activity.createdAt) || "—"}</p>
                              {activity.salaryAmount && <p>Lương: {activity.salaryAmount}</p>}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <div className="text-gray-600">
                              {activity.note ? (
                                <p>
                                  <span className="font-medium text-gray-700">Ghi chú:</span> {activity.note}
                                </p>
                              ) : (
                                <p className="text-gray-400">Chưa có ghi chú.</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {activity.fileUrl && (
                                <a
                                  href={resolveAssetUrl(activity.fileUrl)}
                                  className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  📎 Tệp đính kèm
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => openNoteModal(activity.id, activity.note)}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                {activity.note ? "Cập nhật ghi chú" : "Thêm ghi chú"}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center text-sm text-gray-500">
              <p>Chọn một đầu mối việc làm để xem chi tiết và nhật ký hoạt động.</p>
              <button
                type="button"
                onClick={() => {
                  if (!jobInterestEnabled) return;
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
                disabled={!jobInterestEnabled}
              >
                <span className="text-lg">＋</span>
                Thêm đầu mối mới
              </button>
            </div>
          )}
        </section>
      </div>

      <CreateLeadModal
        open={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateLead}
      />

      <NotificationPopup notification={notification} onClose={hideNotification} />
      {noteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-lg font-semibold text-gray-900">{noteModal.activityId ? "Cập nhật" : "Thêm"} ghi chú</h3>
              <button
                onClick={closeNoteModal}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <label className="flex flex-col text-sm font-medium text-gray-700">
                Nội dung ghi chú
                <textarea
                  value={noteModal.note}
                  onChange={(event) =>
                    setNoteModal((prev) => ({ ...prev, note: event.target.value }))
                  }
                  rows={4}
                  className="mt-2 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="Nhập ghi chú cho hoạt động"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeNoteModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={noteModal.saving}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  disabled={noteModal.saving}
                >
                  {noteModal.saving ? "Đang lưu..." : "Lưu ghi chú"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageLayout>
  );
}

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateJobLeadPayload) => Promise<void>;
}

function CreateLeadModal({ open, onClose, onSubmit }: CreateLeadModalProps) {
  const [form, setForm] = useState<CreateJobLeadPayload>({
    companyName: "",
    shortName: "",
    address: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ companyName: "", shortName: "", address: "", website: "" });
    }
  }, [open]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.companyName.trim()) return;
    try {
      setSubmitting(true);
      await onSubmit({
        companyName: form.companyName.trim(),
        shortName: form.shortName?.trim() || undefined,
        address: form.address?.trim() || undefined,
        website: form.website?.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thêm đầu mối việc làm</h2>
            <p className="text-xs text-gray-500">Nhập thông tin cơ bản để tạo đầu mối mới.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Đóng</span>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Tên công ty <span className="text-red-500">*</span>
            <input
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="Ví dụ: Công ty TNHH ABC"
              className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              required
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Tên ngắn (tuỳ chọn)
            <input
              name="shortName"
              value={form.shortName ?? ""}
              onChange={handleChange}
              placeholder="Ví dụ: ABC"
              className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Địa chỉ (tuỳ chọn)
            <input
              name="address"
              value={form.address ?? ""}
              onChange={handleChange}
              placeholder="Ví dụ: 123 Trần Duy Hưng, Hà Nội"
              className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Website (tuỳ chọn)
            <input
              name="website"
              value={form.website ?? ""}
              onChange={handleChange}
              placeholder="Ví dụ: https://abc.com"
              className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Đang tạo..." : "Tạo đầu mối"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
