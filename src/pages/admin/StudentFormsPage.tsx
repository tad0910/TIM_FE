import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock8,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";
import TableSkeleton from "../../components/TableSkeleton";
import StudentFormCreatePanel from "../../components/forms/StudentFormCreatePanel";
import {
  type FormsQueryFilters,
  useFormTemplates,
  useFormsQuery,
} from "../../hooks/api/forms";
import type { FormStatus } from "../../types/form";

const statusBadgeStyles: Record<FormStatus | "DEFAULT", string> = {
  APPROVED: "text-emerald-600",
  REJECTED: "text-rose-600",
  PROCESSING: "text-sky-600",
  PENDING: "text-amber-600",
  DEFAULT: "text-slate-600",
};

const statusLabels: Record<FormStatus | "UNKNOWN", string> = {
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "TỪ CHỐI",
  PROCESSING: "ĐANG XỬ LÝ",
  PENDING: "CHỜ DUYỆT",
  UNKNOWN: "KHÔNG RÕ",
};

const statusFilters: Array<{ label: string; value: FormStatus | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Đang xử lý", value: "PROCESSING" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Từ chối", value: "REJECTED" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function StudentFormsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FormsQueryFilters>({
    templateName: null,
    status: "ALL",
    search: "",
    page: 0,
    pageSize: 10,
    sort: "created_desc",
  });
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  const {
    data: templates = [],
    isLoading: loadingTemplates,
    error: templateError,
  } = useFormTemplates();
  const {
    data: formsQuery,
    isLoading: loadingForms,
    error: formsError,
    refetch,
  } = useFormsQuery(filters);

  const currentPage = formsQuery?.page ?? filters.page ?? 0;
  const pageSize = formsQuery?.pageSize ?? filters.pageSize ?? 10;
  const totalPages = formsQuery?.totalPages ?? 1;
  const totalItems = formsQuery?.totalItems ?? 0;
  const currentItems = formsQuery?.items ?? [];

  const displayCount =
    totalItems === 0 ? 0 : Math.min((currentPage + 1) * pageSize, totalItems);

  const templateSelectValue = useMemo(() => {
    if (!filters.templateName) {
      return "__ALL__";
    }
    return filters.templateName;
  }, [filters.templateName]);

  const statCards = useMemo(
    () => [
      {
        label: "Tổng đơn",
        value: formsQuery?.stats.total ?? 0,
        icon: Layers,
        accent: "text-teal-600",
        badge: "bg-teal-50",
      },
      {
        label: "Chờ duyệt",
        value: formsQuery?.stats.pending ?? 0,
        icon: Clock8,
        accent: "text-amber-600",
        badge: "bg-amber-50",
      },
      {
        label: "Đang xử lý",
        value: formsQuery?.stats.processing ?? 0,
        icon: Loader2,
        accent: "text-sky-600",
        badge: "bg-sky-50",
      },
      {
        label: "Đã duyệt",
        value: formsQuery?.stats.approved ?? 0,
        icon: CheckCircle2,
        accent: "text-emerald-600",
        badge: "bg-emerald-50",
      },
      {
        label: "Từ chối",
        value: formsQuery?.stats.rejected ?? 0,
        icon: XCircle,
        accent: "text-rose-600",
        badge: "bg-rose-50",
      },
    ],
    [formsQuery?.stats]
  );

  const handleStatusChange = (value: FormStatus | "ALL") => {
    setFilters((prev) => ({
      ...prev,
      status: value,
      page: 0,
    }));
  };

  const handleTemplateChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      templateName: value === "__ALL__" ? null : value,
      page: 0,
    }));
  };

  const handlePageChange = (nextPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(0, Math.min(nextPage, Math.max(totalPages - 1, 0))),
    }));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchInput.trim(),
      page: 0,
    }));
  };

  const renderStatusBadge = (status?: FormStatus | null) => {
    if (!status) {
      return (
        <span className={`text-sm font-semibold ${statusBadgeStyles.DEFAULT}`}>
          {statusLabels.UNKNOWN}
        </span>
      );
    }
    const tone = statusBadgeStyles[status] ?? statusBadgeStyles.DEFAULT;
    return (
      <span className={`text-sm font-semibold ${tone}`}>
        {statusLabels[status]}
      </span>
    );
  };

  const handleRowClick = (formId: number) => {
    navigate(`/admin/forms/${formId}`);
  };

  const errorMessage = templateError?.message ?? formsError?.message ?? "";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${card.badge}`}>
                  <Icon className={`h-5 w-5 ${card.accent}`} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {[
            { key: "list", label: "Danh sách đơn" },
            { key: "create", label: "Tạo đơn mới" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as "list" | "create")}
              className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {activeTab === "list" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm kiếm theo học viên, lớp, chương trình..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </form>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>
      )}

      {activeTab === "list" && (
        <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map((chip) => (
              <button
                type="button"
                key={chip.value}
                onClick={() => handleStatusChange(chip.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  filters.status === chip.value
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center justify-end gap-2">
                <label className="text-slate-500">Loại đơn</label>
                <select
                  value={templateSelectValue}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  disabled={loadingTemplates}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="__ALL__">Tất cả loại đơn</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-500">Kích thước trang</label>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      pageSize: Number(event.target.value),
                      page: 0,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
        </div>
      </section>
      

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 px-4 py-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 w-16 text-center">STT</th>
                <th className="px-4 py-2">Loại đơn</th>
                <th className="px-4 py-2">Học viên</th>
                <th className="px-4 py-2">Lớp</th>
                <th className="px-4 py-2">Chương trình</th>
                <th className="px-4 py-2">Ngày tạo</th>
                <th className="px-4 py-2 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loadingForms ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <TableSkeleton rows={5} columns={6} />
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Không có đơn nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                currentItems.map((form, index) => (
                  <tr
                    key={form.id}
                    className="cursor-pointer rounded-2xl bg-slate-50/70 text-sm text-slate-700 transition hover:bg-teal-50"
                    onClick={() => handleRowClick(form.id)}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {form.templateName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {form.studentName ?? "—"}
                        </span>
                        <span className="text-xs text-slate-500">
                          Mã HV: {form.studentId ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {form.className ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {form.programName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(form.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderStatusBadge(form.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {displayCount} / {totalItems} đơn
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage + 1 >= totalPages}
              className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
        </>
      )}

      {activeTab === "create" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-xs font-semibold uppercase text-teal-500">Tạo đơn</p>
            <h2 className="text-lg font-semibold text-slate-900">
              Thêm đơn mới cho học viên
            </h2>
            <p className="text-sm text-slate-500">
              Điền thông tin cần thiết để tạo đơn chuyển lớp, bảo lưu, thôi học...
            </p>
          </div>
          <div className="px-6 py-4">
            <StudentFormCreatePanel
              templates={templates}
              onFormSuccess={() => {
                setActiveTab("list");
                void refetch();
              }}
              onFormCancel={() => setActiveTab("list")}
            />
          </div>
        </section>
      )}

    </div>
  );
}

