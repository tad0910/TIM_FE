import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AdminHeader, type AdminBreadcrumbItem } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

interface AdminShellProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  onLeaveAdmin?: () => void;
  headerTitle?: string;
  headerBreadcrumbs?: AdminBreadcrumbItem[];
  headerActions?: ReactNode;
  onHeaderNavigate?: (href: string) => void;
  children: ReactNode;
}

interface AdminHeaderState {
  title?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  actions?: ReactNode;
}

interface AdminHeaderContextValue {
  updateHeader: (value: Partial<AdminHeaderState>) => void;
  resetHeader: () => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | undefined>(
  undefined
);

export function useAdminHeader(): AdminHeaderContextValue {
  const context = useContext(AdminHeaderContext);
  if (!context) {
    throw new Error("useAdminHeader must be used within an AdminShell");
  }
  return context;
}

export function AdminShell({
  sidebarCollapsed,
  onToggleSidebar,
  activePath,
  onNavigate,
  userName,
  userEmail,
  avatarUrl,
  onLeaveAdmin,
  headerTitle,
  headerBreadcrumbs,
  headerActions,
  onHeaderNavigate,
  children,
}: AdminShellProps) {
  const defaultHeaderState = useMemo<AdminHeaderState>(
    () => ({
      title: headerTitle,
      breadcrumbs: headerBreadcrumbs,
      actions: headerActions,
    }),
    [
      headerTitle,
      headerBreadcrumbs,
      headerActions,
    ]
  );

  const [headerState, setHeaderState] = useState<AdminHeaderState>(
    defaultHeaderState
  );

  useEffect(() => {
    setHeaderState(defaultHeaderState);
  }, [defaultHeaderState]);

  const updateHeader = useCallback((value: Partial<AdminHeaderState>) => {
    setHeaderState((prev) => ({ ...prev, ...value }));
  }, []);

  const resetHeader = useCallback(() => {
    setHeaderState(defaultHeaderState);
  }, [defaultHeaderState]);

  const contextValue = useMemo<AdminHeaderContextValue>(
    () => ({ updateHeader, resetHeader }),
    [updateHeader, resetHeader]
  );

  return (
    <AdminHeaderContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={onToggleSidebar}
          activePath={activePath}
          onNavigate={onNavigate}
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          onLeaveAdmin={onLeaveAdmin}
        />

        <div
          className={`transition-[margin-left] duration-300 ease-in-out ${
            sidebarCollapsed ? "ml-20" : "ml-[260px]"
          }`}
        >
          <AdminHeader
            sidebarCollapsed={sidebarCollapsed}
            title={headerState.title}
            breadcrumbs={headerState.breadcrumbs}
            actions={headerState.actions}
            onBreadcrumbNavigate={onHeaderNavigate ?? onNavigate}
          />

          <main className="min-h-screen px-6 pb-10 pt-20">{children}</main>
        </div>
      </div>
    </AdminHeaderContext.Provider>
  );
}
