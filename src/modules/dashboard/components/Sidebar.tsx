import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCurrentAvatar } from "../../../services/avatar";
import { useAuthStore } from "../../../store/useAuthStore";
import { getUserProfile, getUserById } from "../../../services/profileApi";
import {
  getMyGamificationStats,
  type UserGamificationStats,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { useIsAdmin } from "../../../utils/useIsAdmin";

function roleMatches(role?: string, keywords: string[] = []) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isLecturerRole(role?: string) {
  return roleMatches(role, ["teacher", "giao_vien", "lecturer"]);
}

export default function Sidebar() {
  const avatarUrl = useCurrentAvatar();
  const { user } = useAuthStore();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  
  const rolesFromStorage =
    typeof window !== "undefined"
      ? localStorage.getItem("roles") || localStorage.getItem("role") || ""
      : "";
  const isLecturer =
    isLecturerRole(user?.role) || isLecturerRole(rolesFromStorage);
  const isAcademicStaff =
    roleMatches(user?.role, ["giao_vu", "academic"]) ||
    roleMatches(rolesFromStorage, ["giao_vu", "academic"]);
  const isRegularUser =
    roleMatches(user?.role, ["role_user", "user", "sinh_vien", "student"]) ||
    roleMatches(rolesFromStorage, [
      "role_user",
      "user",
      "sinh_vien",
      "student",
    ]);

  const {
    data: userInfo,
  } = useQuery({
    queryKey: ['user', 'byId', user?.id || ''],
    queryFn: async () => {
      if (!user?.id) throw new Error('No userId available');
      return getUserById(user.id);
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: userProfile,
  } = useQuery({
    queryKey: queryKeys.profile.detail(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('No userId available');
      return getUserProfile(user.id);
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const fullName = useMemo(() => {
    if (userInfo) {
      const nameFromUser = [userInfo.firstName, userInfo.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (nameFromUser) {
        return nameFromUser;
      }
      return userInfo.username || "";
    }
    if (userProfile) {
      const nameFromProfile = [userProfile.firstName, userProfile.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (nameFromProfile) {
        return nameFromProfile;
      }
      return userProfile.username || "";
    }
    return user?.username || "";
  }, [userInfo, userProfile, user?.username]);

  const {
    data: gamificationStats,
    isLoading: isLoadingStats,
  } = useQuery<UserGamificationStats>({
    queryKey: queryKeys.gamification.myStats(),
    queryFn: () => getMyGamificationStats(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const formatPoints = (value?: number) => {
    if (typeof value === "number") {
      return value.toLocaleString("vi-VN");
    }
    return "—";
  };
  return (
    <aside className="space-y-4 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain -ml-4 pl-3 pr-3 mr-2 min-w-[240px]">
      <div className="rounded-2xl shadow-lg p-4 bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-14 h-14 rounded-full object-cover ring-2 ring-white/70"
          />
          <div className="text-white">
            <p className="font-semibold leading-tight">{fullName || ""}</p>
            <p className="text-xs text-white/80">CodeGym Software</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Điểm thưởng</p>
          {isLoadingStats && (
            <span className="text-xs text-gray-500">Đang tải...</span>
          )}
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/competency", { state: { pointType: "diligence" } })}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "clock"]}
                className="text-blue-600 w-4 h-4"
              />
              <p className="text-sm text-gray-600">Điểm chuyên cần</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalDiligence)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/competency", { state: { pointType: "competence" } })}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "brain"]}
                className="text-blue-600 w-4 h-4"
              />

              <p className="text-sm text-gray-600">Điểm năng lực</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalCompetence)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/competency", { state: { pointType: "experience" } })}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "book-open"]}
                className="text-blue-600 w-4 h-4"
              />

              <p className="text-sm text-gray-600">Điểm kinh nghiệm</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalExperience)}
            </span>
          </button>
        </div>
        {!isLoadingStats && !gamificationStats && (
          <p className="text-xs text-gray-500 mt-3">
            Chưa có dữ liệu điểm thưởng.
          </p>
        )}
      </div>

      <nav className="bg-white rounded-2xl shadow divide-y">
        <ul className="p-2 text-sm">
          {isRegularUser && (
            <>
              <li>
                <Link
                  to="/my-courses"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={["fas", "book"]}
                    className="text-blue-600 w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">
                    Khóa học của tôi
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/job-tracking"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon icon={["fas", "briefcase"]} className="text-blue-600 w-4 h-4" />
                  <span className="font-medium text-gray-800">Theo dõi việc làm</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/schedule"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={["fas", "calendar"]}
                    className="text-blue-600 w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">Lịch học</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/scores"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={["fas", "chart-bar"]}
                    className="text-blue-600 w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">Điểm số</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/scores/rewards"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon icon={["fas", "trophy"]} className="text-blue-600 w-4 h-4" />
                  <span className="font-medium text-gray-800">Điểm thưởng</span>
                </Link>
              </li>
            </>
          )}
          {isLecturer && (
            <>
              <li>
                <Link
                  to="/attendance-management"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={["fas", "user-check"]}
                    className="text-blue-600 w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">
                    Quản lý điểm danh
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/teacher/forms"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={["fas", "file-lines"]}
                    className="text-blue-600 w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">
                    Quản lý danh sách đơn
                  </span>
                </Link>
              </li>
            </>
          )}
          {isAcademicStaff && (
            <li>
              <Link
                to="/forms"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FontAwesomeIcon
                  icon={["fas", "file-lines"]}
                  className="text-blue-600 w-4 h-4"
                />
                <span className="font-medium text-gray-800">
                  Quản lý đơn từ
                </span>
              </Link>
            </li>
          )}
          <li>
            <Link
              to="/tuition"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon
                icon={["fas", "dollar-sign"]}
                className="text-blue-600 w-4 h-4"
              />
              <span className="font-medium text-gray-800">Học phí</span>
            </Link>
          </li>
          <li>
            <Link
              to="/gamification/guide"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon
                icon={["fas", "circle-question"]}
                className="text-indigo-600 w-4 h-4"
              />
              <span className="font-medium text-gray-800">
                Hướng dẫn Gamification
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="/financial-policy"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon
                icon={["fas", "file-invoice-dollar"]}
                className="text-blue-600 w-4 h-4"
              />
              <span className="font-medium text-gray-800">
                Chính sách tài chính
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="/education-policy"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon
                icon={["fas", "graduation-cap"]}
                className="text-blue-600 w-4 h-4"
              />
              <span className="font-medium text-gray-800">
                Chính sách giáo dục
              </span>
            </Link>
          </li>

          <li>
            <Link
              to="/privacy-policy"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon
                icon={["fas", "shield-halved"]}
                className="text-indigo-600 w-4 h-4"
              />
              <span className="font-medium text-gray-800">
                Chính sách Bảo mật
              </span>
            </Link>
          </li>
          {isAdmin && (
            <li className="space-y-1 py-1">
              <div className="flex items-center gap-3 px-3 py-2 text-gray-800 font-medium">
                <FontAwesomeIcon
                  icon={["fas", "users-gear"]}
                  className="text-red-600 w-4 h-4"
                />
                <span>Quản Lý Người Dùng</span>
              </div>
              <ul className="pl-9 space-y-1">
                <li>
                  <Link
                    to="/admin/users"
                    className="block px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    Người dùng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/roles"
                    className="block px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    Vai trò
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/permissions"
                    className="block px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    Quyền hạn
                  </Link>
                </li>
              </ul>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
