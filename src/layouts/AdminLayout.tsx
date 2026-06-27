import { useMemo } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AdminShell } from "../components/admin/layout/AdminShell";
import {
  ADMIN_MENU_GROUPS,
  type AdminMenuItem,
} from "../components/admin/layout/AdminSidebar";
import { useAdminLayout } from "../components/admin/layout/useAdminLayout";
import { useIsAdmin } from "../utils/useIsAdmin";

const DEFAULT_TITLE = "Dashboard quản trị";

function findActiveMenuItem(activePath: string): AdminMenuItem | null {
  for (const group of ADMIN_MENU_GROUPS) {
    for (const item of group.items) {
      if (activePath === item.path || activePath.startsWith(`${item.path}/`)) {
        return item;
      }
    }
  }
  return null;
}

export default function AdminLayout() {
  const isAdmin = useIsAdmin();
  const {
    sidebarCollapsed,
    activePath,
    userName,
    userEmail,
    avatarUrl,
    handleToggleSidebar,
    handleNavigate,
    handleLeaveAdmin,
  } = useAdminLayout();

  const activeItem = useMemo(() => findActiveMenuItem(activePath), [activePath]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const defaultBreadcrumbs = useMemo(
    () => [
      { label: "Admin", href: "/admin/dashboard" },
      { label: activeItem?.label ?? DEFAULT_TITLE },
    ],
    [activeItem?.label]
  );

  return (
    <AdminShell
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={handleToggleSidebar}
      activePath={activePath}
      onNavigate={handleNavigate}
      userName={userName}
      userEmail={userEmail}
      avatarUrl={avatarUrl}
      onLeaveAdmin={handleLeaveAdmin}
      headerTitle={activeItem?.label ?? DEFAULT_TITLE}
      headerBreadcrumbs={defaultBreadcrumbs}
      onHeaderNavigate={handleNavigate}
    >
      <Outlet />
    </AdminShell>
  );
}