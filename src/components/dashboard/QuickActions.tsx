import {
  AcademicCapIcon,
  UserGroupIcon,
  BriefcaseIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const actions = [
  { label: "Tạo lớp mới", icon: AcademicCapIcon, path: "/admin/classes" },
  { label: "Quản lý học viên", icon: UserGroupIcon, path: "/admin/users" },
  { label: "Theo dõi job", icon: BriefcaseIcon, path: "/admin/job-tracking" },
  { label: "Học phí & lộ trình", icon: BanknotesIcon, path: "/admin/tuition" },
  { label: "Đơn từ", icon: DocumentDuplicateIcon, path: "/admin/forms" },
  { label: "Điểm danh", icon: ClipboardDocumentListIcon, path: "/admin/attendance" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Tác vụ nhanh</p>
          <h3 className="text-lg font-semibold text-gray-900">Rút ngắn thao tác quản trị</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:shadow-sm"
              type="button"
            >
              <span className="rounded-md bg-white p-2 shadow-xs ring-1 ring-gray-200">
                <Icon className="h-5 w-5 text-gray-700" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">Đi tới {item.label.toLowerCase()}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
