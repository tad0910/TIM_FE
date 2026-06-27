import { memo } from "react";

export type ClassTabKey =
  | "modules"
  | "students"
  | "grades"
  | "tuition"
  | "jobs"
  | "attendance";

const TAB_ITEMS: Array<{ key: ClassTabKey; label: string }> = [
  { key: "modules", label: "Modules" },
  { key: "students", label: "Học viên" },
  { key: "grades", label: "Điểm số" },
  { key: "attendance", label: "Điểm danh" },
  { key: "jobs", label: "Việc làm" },
  { key: "tuition", label: "Học phí" },
];

interface ClassDetailTabsProps {
  activeTab: ClassTabKey;
  onSelect: (tab: ClassTabKey) => void;
  actions?: React.ReactNode;
}

function ClassDetailTabs({ activeTab, onSelect, actions }: ClassDetailTabsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <nav className="flex flex-wrap items-center gap-2">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === item.key
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export default memo(ClassDetailTabs);
