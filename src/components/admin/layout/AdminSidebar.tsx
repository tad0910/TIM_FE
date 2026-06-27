import {
  Banknote,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  Megaphone,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import codegymLogoCompact from "../../../assets/icon-small-150x150.png";
import codegymLogoFull from "../../../assets/Logo-CodeGym-W-05.png";

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    title: "Tổng quan",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, path: "/admin/dashboard" },
    ],
  },
  {
    title: "Đào tạo",
    items: [
      { id: "programs", label: "Chương trình", icon: LayoutGrid, path: "/admin/programs" },
      { id: "modules", label: "Module", icon: FileText, path: "/admin/modules" },
      { id: "classes", label: "Lớp học", icon: GraduationCap, path: "/admin/classes" },
    ],
  },
  {
    title: "Dịch vụ",
    items: [
      { id: "forms", label: "Đơn từ", icon: ClipboardList, path: "/admin/forms" },
    ],
  },
  {
    title: "Tài chính",
    items: [
      { id: "tuition", label: "Học phí", icon: Banknote, path: "/admin/tuition" },
    ],
  },
  {
    title: "Việc làm",
    items: [
      { id: "companies", label: "Công ty", icon: Building2, path: "/admin/companies" },
      { id: "job-leads", label: "Việc làm", icon: Briefcase, path: "/admin/job-tracking" },
    ],
  },
  {
    title: "Gamification",
    items: [
      { id: "rewards", label: "Điểm thưởng", icon: Sparkles, path: "/admin/gamification/reward-points" },
      { id: "behaviors", label: "Hành vi", icon: SlidersHorizontal, path: "/admin/gamification/behaviors" },
      { id: "announcements", label: "Thông báo", icon: Megaphone, path: "/admin/gamification/notifications" },
      { id: "achievements", label: "Điểm & thành tích", icon: Trophy, path: "/admin/gamification/achievements" },
    ],
  },
  {
    title: "Quản Lý Người Dùng",
    items: [
      { id: "users", label: "Người dùng", icon: Users, path: "/admin/users" },
      { id: "roles", label: "Vai trò", icon: ShieldCheck, path: "/admin/roles" },
      { id: "permissions", label: "Quyền hạn", icon: Settings, path: "/admin/permissions" },
    ],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  onLeaveAdmin?: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggle,
  activePath,
  onNavigate,
  userName,
  userEmail,
  avatarUrl,
  onLeaveAdmin,
}: AdminSidebarProps) {

  const handleNavigate = (item: AdminMenuItem) => {
    onNavigate(item.path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen border-r border-slate-200 bg-white transition-all duration-300 ease-in-out shadow-sm z-40 ${
        collapsed ? "w-20" : "w-[260px]"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-4 border-b border-slate-200">
          <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-2 rounded-lg p-1 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-200 ${
              collapsed ? "mx-auto" : ""
            }`}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <img src={codegymLogoCompact} alt="CodeGym" className="h-10 w-10 object-contain" />
            ) : (
              <img src={codegymLogoFull} alt="CodeGym" className="h-9 w-auto" />
            )}
            {!collapsed && <ChevronLeft className="h-5 w-5 text-slate-500" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {ADMIN_MENU_GROUPS.map((group) => (
            <div key={group.title} className="px-2 pb-6">
              {!collapsed && (
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    activePath === item.path || activePath.startsWith(`${item.path}/`);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item)}
                      title={collapsed ? item.label : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-teal-50 text-teal-600"
                          : "text-slate-600 hover:bg-slate-100"
                      } ${collapsed ? "justify-center" : "justify-start"}`}
                    >
                      <Icon className="h-5 w-5" />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div
            className={`flex items-center gap-3 rounded-lg px-3 py-3 ${
              collapsed ? "flex-col" : "bg-slate-50"
            }`}
          >
            <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-full w-full text-slate-300" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
                {userEmail && (
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onLeaveAdmin}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Thoát quản trị
          </button>
        </div>
      </div>
    </aside>
  );
}
