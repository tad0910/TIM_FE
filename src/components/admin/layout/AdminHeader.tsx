import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface AdminBreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
  title?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  actions?: ReactNode;
  onBreadcrumbNavigate?: (href: string) => void;
}

export function AdminHeader({
  sidebarCollapsed,
  title = "Dashboard quản trị",
  breadcrumbs,
  actions,
  onBreadcrumbNavigate,
}: AdminHeaderProps) {
  const breadcrumbItems = breadcrumbs?.length
    ? breadcrumbs
    : [
        { label: "Admin" },
        { label: "Đào tạo" },
        { label: title },
      ];

  return (
    <header
      className={`fixed top-0 right-0 h-16 border-b border-slate-200 bg-white transition-all duration-300 ease-in-out z-30 ${
        sidebarCollapsed ? "left-20" : "left-[260px]"
      }`}
    >
      <div className="flex h-full items-center justify-between gap-6 px-6">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
            {breadcrumbItems.map((item, index) => (
              <div key={item.label + index} className="flex items-center gap-2">
                {item.href ? (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbNavigate?.(item.href!)}
                    className="truncate transition hover:text-teal-600"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            ))}
          </div>
          <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
        </div>

        {actions ? (
          <div className="flex items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
