import { useCallback, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router-dom";
import NotificationPopup from "../../components/NotificationPopup";
import TableSkeleton from "../../components/TableSkeleton";
import LoadingSpinner from "../../components/tuition/LoadingSpinner";
import {
  useCreateJobLeadMutation,
  useJobInterestMutation,
  useJobLeadsQuery,
  useJobOverviewQuery,
  useJobTrackingQuery,
} from "../../hooks/api/jobs";
import { useNotification } from "../../hooks/useNotification";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import Pagination from "../../components/Pagination";
import { programApi } from "../../services/programApi";
import type { Program } from "../../types/program";
import type {
  AdminJobOverviewClassSummary,
  AdminJobTrackingRow,
  CreateJobLeadPayload,
  JobLeadStatusCode,
} from "../../types/job";

const STATUS_LABELS: Record<JobLeadStatusCode, string> = {
  NEW: "Mới",
  APPLIED: "Đã ứng tuyển",
  INTERVIEWING: "Đang phỏng vấn",
  OFFER: "Đã nhận offer",
  PROBATION: "Thử việc",
  OFFICIAL: "Chính thức",
  FAILED: "Không đạt",
  IGNORED: "Bỏ qua",
};

const STATUS_BADGE_CLASSES: Partial<Record<JobLeadStatusCode, string>> = {
  NEW: "bg-gray-100 text-gray-700",
  APPLIED: "bg-sky-100 text-sky-700",
  INTERVIEWING: "bg-indigo-100 text-indigo-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  PROBATION: "bg-amber-100 text-amber-700",
  OFFICIAL: "bg-blue-100 text-blue-700",
  FAILED: "bg-rose-100 text-rose-700",
  IGNORED: "bg-slate-100 text-slate-600",
};

const PAGE_SIZES = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { key: "className", label: "Tên lớp" },
  { key: "totalStudents", label: "Sĩ số" },
  { key: "offerCount", label: "Offer" },
  { key: "activeJobInterest", label: "Nhu cầu job" },
  { key: "recentUpdatePercent", label: "Cập nhật 14 ngày" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

function StatusBadge({ status }: { status: JobLeadStatusCode }) {
  const classes = STATUS_BADGE_CLASSES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function JobTrackingAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { notification, showSuccess, showApiError, hideNotification } = useNotification();
  const { updateHeader, resetHeader } = useAdminHeader();
  const rawPageParam = searchParams.get("page");
  const rawSizeParam = searchParams.get("size");
  const rawQueryParam = searchParams.get("q") ?? "";
  const rawProgramParam = searchParams.get("program") ?? "";
  const rawSortParam = searchParams.get("sort");
  const rawDirParam = searchParams.get("dir");
  const parsedPage = rawPageParam ? Number(rawPageParam) : NaN;
  const parsedSize = rawSizeParam ? Number(rawSizeParam) : NaN;
  const initialPage = Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0;
  const initialPageSize =
    Number.isFinite(parsedSize) && PAGE_SIZES.includes(parsedSize as (typeof PAGE_SIZES)[number])
      ? parsedSize
      : DEFAULT_PAGE_SIZE;
  const initialSortKey = SORT_OPTIONS.some((option) => option.key === rawSortParam)
    ? (rawSortParam as SortKey)
    : "className";
  const initialSortDir = rawDirParam === "desc" ? "desc" : "asc";
  const [searchTerm, setSearchTerm] = useState(rawQueryParam);
  const [programFilter, setProgramFilter] = useState(rawProgramParam);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedClass, setSelectedClass] = useState<AdminJobOverviewClassSummary | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const syncQueryParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams);
      let changed = false;
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          if (params.has(key)) {
            params.delete(key);
            changed = true;
          }
        } else {
          const stringValue = String(value);
          if (params.get(key) !== stringValue) {
            params.set(key, stringValue);
            changed = true;
          }
        }
      });
      if (changed) {
        setSearchParams(params, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const paramSearch = searchParams.get("q") ?? "";
    if (paramSearch !== searchTerm) {
      setSearchTerm(paramSearch);
    }
    const paramProgram = searchParams.get("program") ?? "";
    if (paramProgram !== programFilter) {
      setProgramFilter(paramProgram);
    }
    const paramPageRaw = searchParams.get("page");
    const normalizedPage = paramPageRaw ? Number(paramPageRaw) : NaN;
    const nextPage = Number.isFinite(normalizedPage) && normalizedPage >= 0 ? normalizedPage : 0;
    if (nextPage !== page) {
      setPage(nextPage);
    }
    const paramSizeRaw = searchParams.get("size");
    const normalizedSize = paramSizeRaw ? Number(paramSizeRaw) : NaN;
    const nextPageSize =
      Number.isFinite(normalizedSize) && PAGE_SIZES.includes(normalizedSize as (typeof PAGE_SIZES)[number])
        ? normalizedSize
        : DEFAULT_PAGE_SIZE;
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
    const paramSortRaw = searchParams.get("sort");
    const nextSortKey = SORT_OPTIONS.some((option) => option.key === paramSortRaw)
      ? (paramSortRaw as SortKey)
      : "className";
    if (nextSortKey !== sortKey) {
      setSortKey(nextSortKey);
    }
    const paramDirRaw = searchParams.get("dir");
    const nextSortDir = paramDirRaw === "desc" ? "desc" : "asc";
    if (nextSortDir !== sortDir) {
      setSortDir(nextSortDir);
    }
  }, [searchParams, searchTerm, programFilter, page, pageSize, sortKey, sortDir]);

  const overviewFilters = useMemo(
    () => ({
      programId: programFilter ? Number(programFilter) : undefined,
    }),
    [programFilter]
  );

  useEffect(() => {
    updateHeader({
      title: "Theo dõi việc làm",
      breadcrumbs: [
        { label: "Quản trị", href: "/admin/dashboard" },
        { label: "Việc làm" },
        { label: "Theo dõi việc làm" },
      ],
    });
    return () => resetHeader();
  }, [resetHeader, updateHeader]);

  const {
    data,
    isLoading: overviewLoading,
    error: overviewError,
  } = useJobOverviewQuery(overviewFilters);

  const {
    data: trackingRows,
    isLoading: classLoading,
    error: trackingError,
    refetch: refetchClassRows,
  } = useJobTrackingQuery(selectedClass?.classId ?? null, { enabled: Boolean(selectedClass) });

  const jobInterestMutation = useJobInterestMutation(selectedClass?.classId ?? null);

  const classRows = trackingRows ?? [];

  useEffect(() => {
    programApi
      .getAllProgramsAsArray()
      .then(setPrograms)
      .catch((error) => console.error("[JobTrackingAdminPage] program fetch error", error));
  }, []);

  useEffect(() => {
    if (!selectedClass || !data?.classes?.length) return;
    const stillExists = data.classes.find((cls) => cls.classId === selectedClass.classId);
    if (!stillExists) {
      setSelectedClass(null);
    }
  }, [data?.classes, selectedClass]);

  const classes = data?.classes ?? [];

  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    const keyword = searchTerm.trim().toLowerCase();
    return classes.filter((cls) => cls.className.toLowerCase().includes(keyword));
  }, [classes, searchTerm]);

  const sortedClasses = useMemo(() => {
    const sorted = [...filteredClasses].sort((a, b) => {
      switch (sortKey) {
        case "className":
          return a.className.localeCompare(b.className, "vi", { sensitivity: "base" });
        case "totalStudents":
          return (a.totalStudents ?? 0) - (b.totalStudents ?? 0);
        case "offerCount":
          return (a.offerCount ?? 0) - (b.offerCount ?? 0);
        case "activeJobInterest":
          return (a.activeJobInterest ?? 0) - (b.activeJobInterest ?? 0);
        case "recentUpdatePercent":
          return (a.recentUpdatePercent ?? 0) - (b.recentUpdatePercent ?? 0);
        default:
          return 0;
      }
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filteredClasses, sortDir, sortKey]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedClasses.length / pageSize) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sortedClasses.length, page, pageSize, pageSize]);

  const paginatedClasses = useMemo(() => {
    const start = page * pageSize;
    return sortedClasses.slice(start, start + pageSize);
  }, [sortedClasses, page, pageSize]);

  const totalElements = sortedClasses.length;
  const totalPages = totalElements === 0 ? 1 : Math.ceil(totalElements / pageSize);
  const isInitialLoading = overviewLoading && !data;
  const overviewErrorMessage =
    overviewError instanceof Error
      ? overviewError.message
      : overviewError
        ? "Không thể tải dữ liệu tổng quan"
        : null;
  const classErrorMessage =
    trackingError instanceof Error
      ? trackingError.message
      : trackingError
        ? "Không thể tải dữ liệu theo dõi lớp"
        : null;

  const totalStats = {
    totalStudents: data?.totalStudents ?? 0,
    totalOffers: data?.totalOffers ?? 0,
    activeSearch: data?.activeJobInterest ?? 0,
    recentUpdatesPercent: data?.recentUpdatePercent ?? 0,
  };

  const handleSortChange = (key: SortKey) => {
    setPage(0);
    if (sortKey === key) {
      const nextDir = sortDir === "asc" ? "desc" : "asc";
      setSortDir(nextDir);
      syncQueryParams({ sort: key, dir: nextDir, page: 0 });
      return;
    }
    const nextDir = key === "className" ? "asc" : "desc";
    setSortKey(key);
    setSortDir(nextDir);
    syncQueryParams({ sort: key, dir: nextDir, page: 0 });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
    syncQueryParams({ size, page: 0 });
  };

  const handleSearchChange = (value: string) => {
    const trimmed = value.trim();
    setSearchTerm(value);
    setPage(0);
    syncQueryParams({ q: trimmed || null, page: 0 });
  };

  const handleProgramFilterChange = (value?: string) => {
    setProgramFilter(value ?? "");
    setPage(0);
    syncQueryParams({ program: value ?? null, page: 0 });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    syncQueryParams({ page: nextPage });
  };

  const handleToggleJobInterest = async (studentId: number, next: boolean) => {
    if (!selectedClass) return;
    try {
      await jobInterestMutation.mutateAsync({ studentId, jobInterest: next });
      showSuccess(
        next ? "Đã bật nhu cầu job" : "Đã tắt nhu cầu job",
        next
          ? "Học viên sẽ được ưu tiên giới thiệu cơ hội việc làm."
          : "Đã ghi nhận học viên tạm dừng tìm việc."
      );
    } catch (error) {
      showApiError(error, "Không thể cập nhật nhu cầu việc làm");
    }
  };

  const renderStatusBanner = () => {
    if (!overviewErrorMessage) return null;
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {overviewErrorMessage}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <NotificationPopup notification={notification} onClose={hideNotification} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng học viên"
          value={totalStats.totalStudents}
          description="Có dữ liệu job tracking"
          icon={UserGroupIcon}
          accent="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          title="Đã nhận offer"
          value={totalStats.totalOffers}
          description="Gồm offer + chính thức"
          icon={BriefcaseIcon}
          accent="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Cần giới thiệu"
          value={totalStats.activeSearch}
          description="Đang bật nhu cầu job"
          icon={FunnelIcon}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Cập nhật 14 ngày"
          value={`${totalStats.recentUpdatesPercent}%`}
          description="Có log mới gần nhất"
          icon={AcademicCapIcon}
          accent="bg-slate-50 text-slate-700"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <FilterSelect
              label="Chương trình"
              value={programFilter}
              placeholder="Tất cả chương trình"
              options={programs.map((program) => ({ label: program.name, value: String(program.id) }))}
              onChange={handleProgramFilterChange}
            />
          </div>
          <div className="relative w-full min-w-[240px] sm:w-72">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm kiếm lớp (ví dụ: Fullstack K18)"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
        </div>
        {renderStatusBanner()}

        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Sắp xếp:&nbsp;</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSortChange(option.key)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                  sortKey === option.key
                    ? "border-teal-200 bg-teal-50 text-teal-600"
                    : "border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
                {sortKey === option.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Lớp</th>
                <th className="px-4 py-3 text-left">Chương trình</th>
                <th className="w-32 px-4 py-3 text-center">Tổng học viên</th>
                <th className="w-24 px-4 py-3 text-center">Offer</th>
                <th className="w-32 px-4 py-3 text-center">Nhu cầu job</th>
                <th className="w-36 px-4 py-3 text-center">Cập nhật 14 ngày</th>
                <th className="w-24 px-4 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {isInitialLoading ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <TableSkeleton rows={5} columns={8} />
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    Chưa có lớp nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls, index) => (
                  <tr key={cls.classId} className="transition hover:bg-teal-50/40">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {page * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex flex-col gap-0.5">
                        <span>{cls.className}</span>
                        <span className="text-xs text-slate-500">
                          ID lớp: {cls.classId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cls.programName ?? "-"}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900">{cls.totalStudents ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {cls.offerCount ? (
                        <span className="inline-flex min-w-[40px] items-center justify-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {cls.offerCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                      {cls.activeJobInterest ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      <div className="flex flex-col items-center gap-0.5 text-xs">
                        <span className="font-semibold text-slate-800">{cls.updatedWithin14Days}</span>
                        <span className="text-slate-500">({cls.recentUpdatePercent ?? 0}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedClass(cls)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 transition hover:text-teal-700"
                      >
                        Mở
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span>Kích thước trang</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={pageSize}
              onChange={(event) => handlePageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemName="lớp"
          />
        </footer>
      </section>

      {selectedClass && (
        <ClassDrillDownDrawer
          classInfo={selectedClass}
          rows={classRows}
          loading={classLoading}
          error={classErrorMessage}
          onClose={() => setSelectedClass(null)}
          onToggleJobInterest={handleToggleJobInterest}
          onRefresh={async () => {
            await refetchClassRows();
          }}
          updating={jobInterestMutation.isPending}
          showSuccess={showSuccess}
          showApiError={showApiError}
        />
      )}

    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value?: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onChange: (next?: string) => void;
}

function FilterSelect({ label, value, placeholder, options, onChange }: FilterSelectProps) {
  return (
    <div className="min-w-[160px]">
      <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>
      <div className="mt-2">
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
}

function StatCard({ title, value, description, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

interface ClassDrillDownDrawerProps {
  classInfo: AdminJobOverviewClassSummary;
  rows: AdminJobTrackingRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onToggleJobInterest: (studentId: number, jobInterest: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  updating: boolean;
  showSuccess: (title: string, message?: string) => void;
  showApiError: (error: unknown, fallback?: string, title?: string) => string;
}

function ClassDrillDownDrawer({
  classInfo,
  rows,
  loading,
  error,
  onClose,
  onToggleJobInterest,
  onRefresh,
  updating,
  showSuccess,
  showApiError,
}: ClassDrillDownDrawerProps) {
  const [internalNote, setInternalNote] = useState("");
  const [internalNotes, setInternalNotes] = useState<string[]>([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [activeStudent, setActiveStudent] = useState<AdminJobTrackingRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const leadsQuery = useJobLeadsQuery(classInfo.classId, activeStudent?.studentId ?? null, {
    enabled: Boolean(activeStudent?.studentId),
  });
  const createLeadMutation = useCreateJobLeadMutation(classInfo.classId);

  const {
    data: currentLeads = [],
    isLoading: leadInitialLoading,
    isFetching: leadFetching,
    error: leadQueryError,
    refetch: refetchLeads,
  } = leadsQuery;

  const leadLoading = leadInitialLoading || leadFetching;
  const leadError = leadQueryError instanceof Error
    ? leadQueryError.message
    : leadQueryError
      ? "Không thể tải dữ liệu Đầu mối"
      : null;

  useEffect(() => {
    if (!rows.length) {
      setActiveStudent(null);
      return;
    }

    if (!activeStudent) {
      const firstStudent = rows[0];
      setActiveStudent(firstStudent);
      return;
    }

    const updatedActive = rows.find(
      (row) => row.studentId === activeStudent.studentId
    );

    if (updatedActive) {
      setActiveStudent(updatedActive);
    } else {
      const fallback = rows[0];
      setActiveStudent(fallback);
    }
  }, [rows, activeStudent?.studentId]);

  const handleSubmitInternalNote = async () => {
    if (!internalNote.trim()) {
      return;
    }
    setNoteSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setInternalNotes((prev) => [internalNote.trim(), ...prev.slice(0, 4)]);
    setInternalNote("");
    setNoteSubmitting(false);
  };

  const handleCreateLead = async (payload: CreateJobLeadPayload) => {
    if (!activeStudent) return;
    try {
      await createLeadMutation.mutateAsync({ studentId: activeStudent.studentId, payload });
      await refetchLeads();
      showSuccess("Đã gửi giới thiệu", `${activeStudent.studentName} đã được giới thiệu tới doanh nghiệp.`);
      setIsCreateModalOpen(false);
    } catch (error) {
      showApiError(error, "Không thể tạo Đầu mối", "Lỗi");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[95vw] flex-col bg-white shadow-2xl xl:max-w-[85vw]">
        {/* Header - Merged Stats for simplicity */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">{classInfo.className}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {classInfo.programName ?? "Chưa có chương trình"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <UserGroupIcon className="h-3.5 w-3.5" />
                <strong className="text-slate-700">{classInfo.totalStudents}</strong> học viên
              </span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="h-3.5 w-3.5" />
                <strong className="text-slate-700">{classInfo.offerCount}</strong> offer
              </span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1">
                <FunnelIcon className="h-3.5 w-3.5" />
                <strong className="text-slate-700">{classInfo.activeJobInterest}</strong> đang tìm việc
              </span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1">
                <AcademicCapIcon className="h-3.5 w-3.5" />
                Cập nhật: <strong className="text-slate-700">{classInfo.updatedWithin14Days}</strong>
                <span className="text-slate-400">({classInfo.recentUpdatePercent}%)</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              title="Làm mới"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title="Đóng"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left Sidebar: Student List */}
          <div className="flex w-1/3 min-w-[320px] max-w-sm flex-col border-r border-slate-200 bg-white">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-rose-600">{error}</div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {rows.map((student) => (
                    <li
                      key={student.studentId}
                      onClick={() => setActiveStudent(student)}
                      className={`group cursor-pointer border-l-4 px-4 py-3 transition ${
                        activeStudent?.studentId === student.studentId
                          ? "border-teal-500 bg-teal-50/40"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold ${
                              activeStudent?.studentId === student.studentId
                                ? "text-teal-700"
                                : "text-slate-900 group-hover:text-teal-700"
                            }`}
                          >
                            {student.studentName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {student.username ?? `HV-${student.studentId}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => onToggleJobInterest(student.studentId, !student.jobInterest)}
                            title={student.jobInterest ? "Đang tìm việc" : "Tạm dừng tìm việc"}
                            className={`relative h-4 w-7 rounded-full transition-colors ${
                              student.jobInterest ? "bg-teal-500" : "bg-slate-200"
                            } ${updating ? "opacity-60" : ""}`}
                          >
                            <span
                              className={`absolute top-0.5 block h-3 w-3 rounded-full bg-white transition-transform ${
                                student.jobInterest ? "left-[14px]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="truncate text-slate-500">
                          {student.companyName || <span className="text-slate-300">--</span>}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Internal Note Section */}
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Ghi chú nhanh</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  placeholder="Thêm ghi chú..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitInternalNote()}
                />
                <button
                  onClick={handleSubmitInternalNote}
                  disabled={noteSubmitting || !internalNote.trim()}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
              {internalNotes.length > 0 && (
                <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
                  {internalNotes.map((note, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Content: Detail View */}
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            {activeStudent ? (
              <div className="h-full overflow-y-auto p-6">
                {/* Student Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{activeStudent.studentName}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-mono text-slate-400">{activeStudent.studentId}</span>
                      <span>•</span>
                      <span>{activeStudent.username ?? "Chưa có username"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => {
                        if (activeStudent) void refetchLeads();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 transition hover:text-teal-700"
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                      Làm mới dữ liệu
                    </button>
                  </div>
                </div>

                {/* Quick Info Cards */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Trạng thái tìm việc</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-sm font-bold ${
                          activeStudent.jobInterest ? "text-teal-700" : "text-slate-500"
                        }`}
                      >
                        {activeStudent.jobInterest ? "Đang tìm việc" : "Tạm dừng"}
                      </span>
                      <button
                        onClick={() =>
                          onToggleJobInterest(activeStudent.studentId, !activeStudent.jobInterest)
                        }
                        className={`text-xs font-medium underline ${
                          activeStudent.jobInterest ? "text-rose-600" : "text-teal-600"
                        }`}
                      >
                        {activeStudent.jobInterest ? "Tắt" : "Bật"}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Trạng thái hiện tại</p>
                    <div className="mt-2">
                      <StatusBadge status={activeStudent.jobStatusCode as JobLeadStatusCode} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Thu nhập (Offer/Official)</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {activeStudent.offerAmount ||
                        activeStudent.officialSalary ||
                        activeStudent.probationSalary ||
                        "--"}
                    </p>
                  </div>
                </div>

                {/* Đầu mốis Section */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Công việc & Hoạt động</h3>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
                    >
                      <PlusIcon className="mr-1.5 h-4 w-4" />
                      Giới thiệu công việc
                    </button>
                  </div>

                  {leadLoading ? (
                    <div className="py-12 text-center">
                      <LoadingSpinner size="md" />
                      <p className="mt-2 text-sm text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                  ) : leadError ? (
                    <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{leadError}</div>
                  ) : currentLeads.length === 0 ? (
                    <div className="mt-12 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                        <BriefcaseIcon className="h-8 w-8" />
                      </div>
                      <p className="mt-4 font-medium text-slate-900">Chưa có dữ liệu việc làm</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Học viên chưa được giới thiệu hoặc chưa có hoạt động ứng tuyển nào.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {currentLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-lg font-bold text-slate-900 group-hover:text-teal-700">
                                {lead.companyName}
                              </h4>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusBadge status={(lead.statusCode as JobLeadStatusCode) ?? "NEW"} />
                                {lead.jobInterest && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                    Tự tìm việc
                                  </span>
                                )}
                                {lead.fromAdmin && (
                                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                    Admin giới thiệu
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <p>
                                Cập nhật:{" "}
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("vi-VN") : "-"}
                              </p>
                            </div>
                          </div>

                          {/* Activities Timeline */}
                          <div className="mt-6">
                            <p className="mb-3 text-xs font-bold uppercase text-slate-400">Lịch sử hoạt động</p>
                            {lead.activities.length > 0 ? (
                              <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-6 pb-2">
                                {lead.activities.map((activity) => (
                                  <div key={activity.id} className="relative">
                                    <div className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-teal-500 shadow-sm" />
                                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                                      <p className="text-sm font-semibold text-slate-900">
                                        {activity.activityType}
                                      </p>
                                      <span className="text-xs text-slate-400">
                                        {new Date(activity.happenedAt).toLocaleDateString("vi-VN")}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">{activity.content}</p>
                                    {activity.salaryAmount && (
                                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                                        Lương: {activity.salaryAmount}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm italic text-slate-400">Chưa có hoạt động nào được ghi nhận.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <UserGroupIcon className="h-10 w-10" />
                </div>
                <p className="mt-4 text-lg font-medium text-slate-900">Chọn học viên</p>
                <p className="text-sm">Chọn một học viên từ danh sách bên trái để xem chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateJobLeadModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateLead}
        />
      )}
    </div>
  );
}

interface CreateJobLeadModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateJobLeadPayload) => Promise<void>;
}

function CreateJobLeadModal({ onClose, onSubmit }: CreateJobLeadModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateJobLeadPayload>({
    companyName: "",
    shortName: "",
    address: "",
    website: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError("Có lỗi xảy ra khi tạo Đầu mối.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Giới thiệu Job mới</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Tên công ty <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
              placeholder="Ví dụ: FPT Software"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700">Tên viết tắt (Tùy chọn)</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={form.shortName}
              onChange={e => setForm({ ...form, shortName: e.target.value })}
              placeholder="FSOFT"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Địa chỉ (Tùy chọn)</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Hà Nội"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Website (Tùy chọn)</label>
            <input
              type="url"
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={form.website}
              onChange={e => setForm({ ...form, website: e.target.value })}
              placeholder="https://fpt-software.com"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Đang tạo..." : "Tạo Đầu mối"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
