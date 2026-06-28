import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getUserProfile } from "../services/profileApi";
import { useCurrentAvatar } from "../services/avatar";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const { user } = useAuthStore();
  const avatarUrl = useCurrentAvatar();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/scores") return location.pathname === "/scores";
    return location.pathname.startsWith(path);
  };

  const getTabClass = (path: string) => {
    return isActive(path)
      ? "flex items-center justify-center px-4 h-full border-b-[3px] border-blue-600 text-gray-500 transition-colors"
      : "flex items-center justify-center px-4 h-12 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mt-2";
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await getUserProfile(user.id);
        const name =
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          profile.username;
        setDisplayName(name);
      } catch (error) {
        console.error("Error loading user profile:", error);
        setDisplayName(user?.username || "");
      }
    };

    loadUserProfile();
  }, [user?.id, user?.username]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest(".user-menu")) {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      const { logoutAllDevices } = useAuthStore.getState();
      await logoutAllDevices();
      setIsUserMenuOpen(false);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/login";
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm h-16">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-full relative">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center h-full">
            {/* Hamburger for mobile */}
            <button
              onClick={onMenuClick}
              className="mr-3 lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="flex items-center space-x-3 mr-4">
              <span className="text-2xl font-bold text-blue-600 tracking-wide">CODEGYM</span>
            </Link>
            <div className="hidden md:flex items-center bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-3 py-2 w-[240px]">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 ml-2 w-full text-sm font-medium"
              />
            </div>
          </div>

          {/* Central Tabs - Absolutely centered to align with main feed */}
          <div className="hidden lg:flex items-center justify-center gap-1 h-full absolute left-1/2 -translate-x-1/2">
            <Link to="/" title="Trang chủ" className={getTabClass("/")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <Link to="/my-courses" title="Khóa học của tôi" className={getTabClass("/my-courses")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </Link>
            <Link to="/job-tracking" title="Theo dõi việc làm" className={getTabClass("/job-tracking")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link to="/schedule" title="Lịch học" className={getTabClass("/schedule")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link to="/scores" title="Điểm số" className={getTabClass("/scores")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </Link>
            <Link to="/scores/rewards" title="Điểm thưởng" className={getTabClass("/scores/rewards")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </Link>
            <Link to="/tuition" title="Học phí" className={getTabClass("/tuition")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user?.id && (
              <div className="text-gray-900">
                <NotificationBell userId={parseInt(user.id)} />
              </div>
            )}

            <div className="relative user-menu">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center hover:bg-gray-100 transition-all duration-200 p-1 rounded-full focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full relative">
                  <img
                    src={
                      avatarUrl && avatarUrl.trim() !== ""
                        ? avatarUrl
                        : "/default-avatar.png"
                    }
                    alt={user?.username || "User"}
                    className="w-full h-full object-cover rounded-full border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/default-avatar.png";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-200 rounded-full border border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {displayName || user?.username || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.username || ""}
                    </p>
                  </div>

                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-3 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Trang cá nhân
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors mt-1"
                    >
                      <svg
                        className="w-5 h-5 mr-3 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
