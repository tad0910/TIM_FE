import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Search, SquarePlus, Trash2 } from "lucide-react";
import { useAdminProgramModules } from "../../hooks/useAdminProgramModules";
import NotificationPopup from "../../components/NotificationPopup";
import type { Notification } from "../../components/NotificationPopup";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";

interface ModuleListItem {
  id: number;
  name: string;
  description?: string;
}

export default function ProgramModulesPage() {
  const navigate = useNavigate();
  const { programId: programIdParam } = useParams();
  const programId = programIdParam ? Number(programIdParam) : null;

  const { program, modules, isLoading, isError, error, updateModules, isUpdating } =
    useAdminProgramModules(programId);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchSelected, setSearchSelected] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const { updateHeader, resetHeader } = useAdminHeader();

  useEffect(() => {
    if (program?.modules) {
      setSelectedIds(program.modules.map((mod) => mod.id));
    }
  }, [program?.modules]);

  const ModuleColumnSkeleton = () => (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="max-h-[440px] space-y-2 overflow-y-hidden px-5 py-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`module-skeleton-${index}`}
            className="flex h-[62px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 animate-pulse"
          >
            <span className="h-4 w-4 rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/5 rounded bg-slate-200" />
              <div className="h-3 w-2/5 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 px-5 py-3">
        <div className="h-3 w-48 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
  );

  const availableModules = useMemo<ModuleListItem[]>(() => {
    if (!modules) return [];
    const keyword = searchAvailable.trim().toLowerCase();
    return modules
      .filter((mod) => !selectedIds.includes(mod.id))
      .filter((mod) =>
        keyword ? mod.name.toLowerCase().includes(keyword) : true
      );
  }, [modules, searchAvailable, selectedIds]);

  const selectedModules = useMemo<ModuleListItem[]>(() => {
    if (!modules) return [];
    const keyword = searchSelected.trim().toLowerCase();
    return modules
      .filter((mod) => selectedIds.includes(mod.id))
      .filter((mod) =>
        keyword ? mod.name.toLowerCase().includes(keyword) : true
      );
  }, [modules, searchSelected, selectedIds]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    setSelectedIds((prev) => {
      const ids = availableModules
        .map((mod) => mod.id)
        .filter((id) => !prev.includes(id));
      return [...prev, ...ids];
    });
  };

  const handleClearSelected = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    if (!programId) return;
    try {
      await updateModules(selectedIds);
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Cập nhật thành công",
        message: "Danh sách module đã được lưu.",
        duration: 3000,
      });
      navigate("/admin/programs");
    } catch (err) {
      console.error(err);
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Không thể lưu",
        message: err instanceof Error ? err.message : "Vui lòng thử lại.",
        duration: 4000,
      });
    }
  };

  const pageTitle = program?.name ? `Modules – ${program.name}` : "Modules";

  useEffect(() => {
    updateHeader({
      title: pageTitle,
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Chương trình", href: "/admin/programs" },
        { label: program?.name ?? "Chi tiết" },
      ],
    });

    return () => {
      resetHeader();
    };
  }, [pageTitle, program?.name, resetHeader, updateHeader]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="h-7 w-60 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-8 w-28 rounded-full bg-slate-100 animate-pulse" />
            <span className="h-8 w-28 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </header>

        <div className="flex flex-col gap-5 lg:flex-row">
          <ModuleColumnSkeleton />
          <ModuleColumnSkeleton />
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <span className="h-10 w-24 rounded-lg bg-slate-100 animate-pulse" />
          <span className="h-10 w-32 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <NotificationPopup
          notification={notification}
          onClose={() => setNotification(null)}
        />
      </div>
    );
  }

  const renderModuleColumn = (
    title: string,
    description: string,
    modulesList: ModuleListItem[],
    emptyText: string,
    actions: React.ReactNode,
    footerAction?: React.ReactNode
  ) => (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="max-h-[440px] overflow-y-auto px-2 py-2">
        {modulesList.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          <ul className="space-y-2">
            {modulesList.map((mod) => (
              <li
                key={mod.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-teal-200 hover:shadow"
              >
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(mod.id)}
                    onChange={() => handleToggle(mod.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <span className="font-medium text-slate-900">{mod.name}</span>
                    {mod.description && (
                      <span className="mt-1 block text-xs text-slate-500">
                        {mod.description}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {footerAction && (
        <div className="border-t border-slate-200 px-5 py-3 text-right text-xs text-slate-500">
          {footerAction}
        </div>
      )}
    </div>
  );

  const searchInput = (
    key: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string
  ) => (
    <div key={key} className="relative w-64">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý modules đã gán cho chương trình. Tick để thêm/bỏ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-600">
            Đã chọn: {selectedIds.length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Tổng module: {modules?.length ?? 0}
          </span>
        </div>
      </header>

      {isError && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error instanceof Error ? error.message : "Không thể tải dữ liệu."}
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-5">
          <div className="h-96 flex-1 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-96 flex-1 rounded-2xl border border-slate-200 bg-white" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row">
          {renderModuleColumn(
            "Modules khả dụng",
            "Chọn các module để thêm vào chương trình",
            availableModules,
            "Không có module nào phù hợp với bộ lọc.",
            [
              searchInput("available-search", searchAvailable, setSearchAvailable, "Tìm module"),
              <button
                key="add"
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
                onClick={handleSelectAllAvailable}
                disabled={availableModules.length === 0}
              >
                <SquarePlus className="h-4 w-4" />
                Chọn tất cả
              </button>,
            ],
            availableModules.length > 0 && (
              <span>
                Đang hiển thị {availableModules.length} module khả dụng
              </span>
            )
          )}

          {renderModuleColumn(
            "Modules đã chọn",
            "Bỏ tick để loại khỏi chương trình",
            selectedModules,
            "Chưa chọn module nào.",
            [
              searchInput("selected-search", searchSelected, setSearchSelected, "Tìm module"),
              <button
                key="clear"
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={handleClearSelected}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Bỏ chọn tất cả
              </button>,
            ],
            selectedModules.length > 0 && (
              <span>Đang hiển thị {selectedModules.length} module đã chọn</span>
            )
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          onClick={() => navigate("/admin/programs")}
        >
          Hủy
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSave}
          disabled={isUpdating || isLoading}
        >
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </button>
      </div>
      <NotificationPopup
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
