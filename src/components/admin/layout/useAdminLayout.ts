import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { useCurrentAvatar } from "../../../services/avatar";
import { getUserProfile } from "../../../services/profileApi";

export function useAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuthStore();
  const avatarUrl = useCurrentAvatar();
  const [displayName, setDisplayName] = useState<string>("");

  const activePath = location.pathname;
  const userName = useMemo(() => {
    return displayName || user?.username || "Quản trị viên";
  }, [displayName, user?.username]);

  const userEmail = user?.email ?? undefined;

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user?.id) {
        setDisplayName(user?.username ?? "");
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        if (cancelled) return;
        const name =
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          profile.username ||
          "";
        setDisplayName(name);
      } catch (err) {
        if (!cancelled) {
          setDisplayName(user?.username ?? "");
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.username]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLeaveAdmin = () => {
    navigate("/");
  };

  return {
    sidebarCollapsed,
    activePath,
    userName,
    userEmail,
    avatarUrl,
    handleToggleSidebar,
    handleNavigate,
    handleLeaveAdmin,
  };
}
