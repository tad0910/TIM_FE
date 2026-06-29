import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { getUserProfile } from "../services/profileApi";
import { useCurrentAvatar } from "../services/avatar";
import NotificationBell from "./NotificationBell";

export default function PostDetailNavbar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const { user } = useAuthStore();
  const avatarUrl = useCurrentAvatar();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await getUserProfile(user.id);
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
        setDisplayName(name);
      } catch (error) {
        console.error("Error loading user profile:", error);
        setDisplayName(user.username || "");
      }
    };
    
    loadUserProfile();
  }, [user?.id, user?.username]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-menu')) {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      const { logoutAllDevices } = useAuthStore.getState();
      await logoutAllDevices();
      setIsUserMenuOpen(false);
      window.location.href = "/login";
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = "/login";
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-xl font-bold text-white">CODEGYM</span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {user?.id && (
              <NotificationBell userId={parseInt(user.id)} />
            )}

            <div className="relative user-menu">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-white hover:text-blue-200 transition-all duration-200 p-1 rounded-full hover:bg-white/10"
              >
                <div className="w-10 h-10 rounded-full relative shadow-lg">
                  <img 
                    src={
                      avatarUrl && avatarUrl.trim() !== ''
                        ? avatarUrl
                        : "/default-avatar.png"
                    }
                    alt={user?.username || 'User'} 
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/default-avatar.png";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
              </button>

                <div className="absolute right-0 mt-3 w-[360px] bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.15)] p-3 z-50 user-menu">
                  {/* Top Profile Card */}
                  <div className="rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-1 mb-3 border border-gray-100">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={avatarUrl && avatarUrl.trim() !== "" ? avatarUrl : "/default-avatar.png"}
                        alt={user?.username || "User"}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                      />
                      <span className="font-semibold text-[17px] text-gray-900">
                        {displayName || user?.username || "User"}
                      </span>
                    </Link>
                    <hr className="my-1 border-gray-200 mx-2" />
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block mx-2 mb-1 mt-1 py-1.5 text-center text-[15px] font-semibold text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Xem tất cả trang cá nhân
                    </Link>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col gap-1">
                    <button
                      className="flex items-center w-full p-2 rounded-lg hover:bg-red-50 transition-colors"
                      onClick={handleLogout}
                    >
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 13v-2H7V8l-5 4 5 4v-3z" />
                          <path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[15px] font-medium text-red-600 flex-1 text-left">Đăng xuất</span>
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
