import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getMyAchievementsWithStatus, 
  getUserAchievementsWithStatus,
  type AchievementWithStatus 
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNotificationContext } from "../../../contexts/NotificationContext";

interface ProgressBadgesSectionProps {
  userId?: string;
}

export default function ProgressBadgesSection({ userId }: ProgressBadgesSectionProps) {
  const { user } = useAuthStore();
  const { notifications } = useNotificationContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const {
    data: achievementsData = [],
    isLoading: achievementsLoading,
  } = useQuery<AchievementWithStatus[]>({
    queryKey: isOwnProfile
      ? queryKeys.gamification.myAchievements()
      : queryKeys.gamification.userAchievements(Number(targetUserId || 0)),
    queryFn: async () => {
      if (!targetUserId) return [];
      return isOwnProfile
        ? getMyAchievementsWithStatus()
        : getUserAchievementsWithStatus(parseInt(targetUserId));
    },
    enabled: Boolean(targetUserId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const achievementNotifications = notifications.filter(notif => 
      notif.notificationType && 
      (notif.notificationType.toUpperCase().includes('ACHIEVEMENT') || 
       notif.notificationType.toUpperCase().includes('THÀNH_TÍCH') ||
       notif.notificationType.toUpperCase() === 'SYSTEM_ANNOUNCEMENT')
    );
    
    if (achievementNotifications.length > 0) {
      console.log('[ProgressBadgesSection] Achievement notification detected, refreshing achievements...', achievementNotifications);
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: isOwnProfile
            ? queryKeys.gamification.myAchievements()
            : queryKeys.gamification.userAchievements(Number(targetUserId || 0)),
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, queryClient, isOwnProfile, targetUserId]);

  const allAchievements = useMemo(() => {
    return [...achievementsData].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      const aMaxPoints = a.highestUnlockedLevelId
        ? a.levels.find((l) => l.levelId === a.highestUnlockedLevelId)?.minPointsRequired || 0
        : (a.nextLevelMinPoints || 0);
      const bMaxPoints = b.highestUnlockedLevelId
        ? b.levels.find((l) => l.levelId === b.highestUnlockedLevelId)?.minPointsRequired || 0
        : (b.nextLevelMinPoints || 0);
      return bMaxPoints - aMaxPoints;
    });
  }, [achievementsData]);

  const isLoading = achievementsLoading;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPointTypeLabel = (pointTypeEnum?: string) => {
    if (!pointTypeEnum) return "điểm";
    const upper = pointTypeEnum.toUpperCase();
    if (upper.includes("DILIGENCE") || upper.includes("CHUYEN_CAN")) return "điểm chuyên cần";
    if (upper.includes("COMPETENCE") || upper.includes("NANG_LUC")) return "điểm năng lực";
    if (upper.includes("EXPERIENCE") || upper.includes("KINH_NGHIEM")) return "điểm kinh nghiệm";
    return "điểm";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ marginTop: '220px' }}>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-16 mb-4"></div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-12 h-12 bg-gray-200 rounded-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6" style={{ marginTop: '220px' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Thành tích</h2>
        
        {allAchievements.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có thành tích nào</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {allAchievements.map((achievement) => {
                const hasUnlockedLevel = achievement.levels?.some((l) => l.isUnlocked);
                if (!hasUnlockedLevel) {
                  return null;
                }
                const highestUnlockedLevel =
                  achievement.levels
                    ?.filter((l) => l.isUnlocked)
                    .sort(
                      (a, b) =>
                        (b.minPointsRequired ?? 0) -
                        (a.minPointsRequired ?? 0)
                    )[0] || null;

                const displayImage =
                  highestUnlockedLevel?.imageUrl || achievement.achievementImageUrl;

                const displayName = highestUnlockedLevel?.levelName || achievement.achievementName;

                const currentLevel = highestUnlockedLevel;
                return (
                  <button
                    key={achievement.achievementId}
                    type="button"
                    className="group relative flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
                    onClick={() => {
                      navigate(`/achievements/${achievement.achievementId}`);
                    }}
                    title={achievement.achievementName}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-sm ${
                        hasUnlockedLevel
                          ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                          : "bg-gray-200"
                      }`}
                    >
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={achievement.achievementName}
                          className={`w-full h-full object-cover ${
                            hasUnlockedLevel ? "" : "grayscale opacity-70"
                          }`}
                        />
                      ) : (
                        <span
                          className={`text-base ${
                            hasUnlockedLevel ? "text-white" : "text-gray-500"
                          }`}
                        >
                          🏆
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-700 text-center whitespace-nowrap w-full">
                      {displayName}
                    </span>

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                      <div className="font-semibold text-sm mb-1">{achievement.achievementName}</div>
                      <div className="text-gray-300 mb-1">
                        Cấp hiện tại: {currentLevel?.levelName || "Chưa đạt"}
                      </div>
                      <div className="text-gray-300 mb-1">
                        Cần tối thiểu {currentLevel?.minPointsRequired ?? 0}{" "}
                        {getPointTypeLabel(currentLevel?.requiredPointTypeEnum)}
                      </div>
                      {currentLevel?.unlockedAt && (
                        <div className="text-gray-400 text-[10px]">
                          Đã đạt: {formatDate(currentLevel.unlockedAt)}
                        </div>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500">
              Bấm vào một huy hiệu để xem đầy đủ các cấp bậc. Cấp đã đạt sẽ sáng, chưa đạt sẽ tối.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
