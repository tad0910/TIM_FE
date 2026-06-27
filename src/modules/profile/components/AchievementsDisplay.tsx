import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getMyAchievementsWithStatus,
  getUserAchievementsWithStatus,
  type AchievementWithStatus,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { useAuthStore } from "../../../store/useAuthStore";

interface AchievementsDisplayProps {
  userId?: string;
}

export default function AchievementsDisplay({ userId }: AchievementsDisplayProps) {
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementWithStatus | null>(null);
  const [isLevelsModalOpen, setIsLevelsModalOpen] = useState(false);
  const { user } = useAuthStore();

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  // React Query: Fetch achievements
  const {
    data: achievementsData = [],
    isLoading,
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

  // Sắp xếp: unlocked trước, sau đó theo điểm cao nhất
  const achievements = useMemo(() => {
    return [...achievementsData].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      // Nếu cùng trạng thái, sắp xếp theo điểm cao nhất
      const aMaxPoints = a.highestUnlockedLevelId
        ? a.levels.find((l) => l.levelId === a.highestUnlockedLevelId)?.minPointsRequired || 0
        : 0;
      const bMaxPoints = b.highestUnlockedLevelId
        ? b.levels.find((l) => l.levelId === b.highestUnlockedLevelId)?.minPointsRequired || 0
        : 0;
      return bMaxPoints - aMaxPoints;
    });
  }, [achievementsData]);

  // Set achievement đầu tiên (ưu tiên đã unlock) làm selected mặc định
  useEffect(() => {
    if (achievements.length > 0 && !selectedAchievement) {
      const firstUnlocked = achievements.find((a) => a.isUnlocked) ?? achievements[0];
      if (firstUnlocked) {
        setSelectedAchievement(firstUnlocked);
      }
    }
  }, [achievements, selectedAchievement]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="w-12 h-12 bg-gray-200 rounded-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Featured achievement: ưu tiên selected, sau đó achievement đầu tiên trong danh sách
  const featuredAchievement = selectedAchievement || achievements[0];

  const getPointTypeLabel = (pointTypeEnum?: string) => {
    if (!pointTypeEnum) return "điểm";
    const upper = pointTypeEnum.toUpperCase();
    if (upper.includes("DILIGENCE") || upper.includes("CHUYEN_CAN")) return "điểm chuyên cần";
    if (upper.includes("COMPETENCE") || upper.includes("NANG_LUC")) return "điểm năng lực";
    if (upper.includes("EXPERIENCE") || upper.includes("KINH_NGHIEM")) return "điểm kinh nghiệm";
    return "điểm";
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Thành tích</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section: Thông tin chi tiết achievement đang chọn */}
        {featuredAchievement ? (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border-2 border-purple-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg overflow-hidden flex-shrink-0">
                {featuredAchievement.highestUnlockedLevelImageUrl ? (
                  <img
                    src={featuredAchievement.highestUnlockedLevelImageUrl}
                    alt={featuredAchievement.achievementName}
                    className="w-full h-full object-cover"
                  />
                ) : featuredAchievement.achievementImageUrl ? (
                  <img
                    src={featuredAchievement.achievementImageUrl}
                    alt={featuredAchievement.achievementName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">🏆</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {featuredAchievement.achievementName}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {featuredAchievement.description ||
                    featuredAchievement.highestUnlockedLevelName ||
                    "Chưa đạt cấp nào"}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span>
                  {featuredAchievement.currentPoints || 0} /{" "}
                  {featuredAchievement.minPointsRequired || 0}
                </span>
                <span>{Math.round(featuredAchievement.progressPercentage || 0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, featuredAchievement.progressPercentage || 0)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Unlock Details */}
            {featuredAchievement.unlockedAt && (
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">Mở khóa cấp hiện tại vào:</span>{" "}
                  {formatDate(featuredAchievement.unlockedAt)}
                </div>
                {featuredAchievement.rarityPercentage !== undefined && (
                  <div>
                    <span className="font-medium">Độ hiếm:</span>{" "}
                    {featuredAchievement.rarityPercentage.toFixed(1)}% người chơi có thành tích
                    này
                  </div>
                )}
              </div>
            )}

            <div className="mt-4" />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 flex items-center justify-center">
            <p className="text-gray-500">Chưa có dữ liệu thành tích</p>
          </div>
        )}

        {/* Right Section: Danh sách các nhóm thành tích - chỉ hiển thị cấp cao nhất đạt được */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Các cấp bậc thành tích đã đạt cao nhất
            </h3>

            {achievements.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có thành tích nào.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {achievements.map((achievement) => {
                  const isSelected =
                    selectedAchievement?.achievementId === achievement.achievementId;
                  const hasUnlockedLevel = achievement.isUnlocked;

                  const imageSrc =
                    achievement.highestUnlockedLevelImageUrl ||
                    achievement.achievementImageUrl;

                  return (
                    <button
                      key={achievement.achievementId}
                      type="button"
                      className={`relative flex flex-col items-center gap-2 p-2 rounded-lg border transition-all focus:outline-none ${
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-300 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedAchievement(achievement);
                        setIsLevelsModalOpen(true);
                      }}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shadow-sm ${
                          hasUnlockedLevel
                            ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                            : "bg-gray-200"
                        }`}
                      >
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={achievement.achievementName}
                            className={`w-full h-full object-cover ${
                              hasUnlockedLevel ? "" : "grayscale opacity-70"
                            }`}
                          />
                        ) : (
                          <span
                            className={`text-lg ${
                              hasUnlockedLevel ? "text-white" : "text-gray-500"
                            }`}
                          >
                            🏆
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-900 line-clamp-2">
                          {achievement.achievementName}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {hasUnlockedLevel
                            ? achievement.highestUnlockedLevelName
                            : "Chưa đạt cấp nào"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal hiển thị toàn bộ cấp bậc của 1 nhóm thành tích */}
      {isLevelsModalOpen && selectedAchievement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 relative">
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setIsLevelsModalOpen(false)}
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedAchievement.achievementName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Các cấp bậc thành tích. Cấp đã đạt sẽ được hiển thị sáng, chưa đạt sẽ bị làm mờ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedAchievement.levels
                .slice()
                .sort(
                  (a, b) =>
                    (a.minPointsRequired ?? Number.MAX_SAFE_INTEGER) -
                    (b.minPointsRequired ?? Number.MAX_SAFE_INTEGER)
                )
                .map((level) => {
                  const isUnlocked = level.isUnlocked;

                  return (
                    <div
                      key={level.levelId}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                        isUnlocked
                          ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
                          : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-sm">
                        {level.imageUrl ? (
                          <img
                            src={level.imageUrl}
                            alt={level.levelName}
                            className={`w-full h-full object-cover ${
                              isUnlocked ? "" : "grayscale opacity-70"
                            }`}
                          />
                        ) : (
                          <span className="text-lg">🎖️</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-semibold text-sm ${
                            isUnlocked ? "text-purple-800" : "text-gray-700"
                          }`}
                        >
                          {level.levelName}
                        </div>
                          <div className="text-xs text-gray-600">
                            Cần tối thiểu {level.minPointsRequired ?? 0}{" "}
                            {getPointTypeLabel(level.requiredPointTypeEnum)}
                          </div>
                        {level.unlockedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Đã đạt: {formatDate(level.unlockedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                onClick={() => setIsLevelsModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

