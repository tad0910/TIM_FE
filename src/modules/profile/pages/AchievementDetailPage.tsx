import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getMyAchievementsWithStatus,
  type AchievementWithStatus,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";

const getPointTypeLabel = (pointTypeEnum?: string, fallbackFromDescription?: string) => {
  // Fallback: một số BE có thể chưa trả requiredPointTypeEnum -> đoán từ description
  const guess = (fallbackFromDescription || "").toLowerCase();
  if (!pointTypeEnum) {
    if (guess.includes("kinh nghiệm")) return "điểm kinh nghiệm";
    if (guess.includes("năng lực")) return "điểm năng lực";
    if (guess.includes("chuyên cần")) return "điểm chuyên cần";
    return "điểm";
  }
  const upper = pointTypeEnum.toUpperCase();
  if (upper.includes("DILIGENCE") || upper.includes("CHUYEN_CAN")) return "điểm chuyên cần";
  if (upper.includes("COMPETENCE") || upper.includes("NANG_LUC")) return "điểm năng lực";
  if (upper.includes("EXPERIENCE") || upper.includes("KINH_NGHIEM")) return "điểm kinh nghiệm";
  return "điểm";
};

export default function AchievementDetailPage() {
  const navigate = useNavigate();
  const { achievementId } = useParams<{ achievementId: string }>();

  // React Query: Fetch all achievements
  const {
    data: allAchievements = [],
    isLoading,
  } = useQuery<AchievementWithStatus[]>({
    queryKey: queryKeys.gamification.myAchievements(),
    queryFn: () => getMyAchievementsWithStatus(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const achievement = useMemo(() => {
    const idNum = Number(achievementId);
    if (!achievementId || Number.isNaN(idNum)) return null;
    return allAchievements.find((a) => a.achievementId === idNum) || null;
  }, [allAchievements, achievementId]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: "#F2F4F7" }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!achievement) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: "#F2F4F7" }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy thành tích</h1>
            <p className="text-gray-600 mb-4">Thành tích này không tồn tại hoặc bạn chưa có quyền xem.</p>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              onClick={() => navigate(-1)}
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const levelsSorted = achievement.levels
    .slice()
    .sort(
      (a, b) =>
        (a.minPointsRequired ?? Number.MAX_SAFE_INTEGER) -
        (b.minPointsRequired ?? Number.MAX_SAFE_INTEGER)
    );

  const pointTypeLabel = getPointTypeLabel(levelsSorted[0]?.requiredPointTypeEnum, achievement.description);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#F2F4F7" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              {achievement.highestUnlockedLevelImageUrl || achievement.achievementImageUrl ? (
                <img
                  src={achievement.highestUnlockedLevelImageUrl || achievement.achievementImageUrl}
                  alt={achievement.achievementName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl text-white">🏆</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{achievement.achievementName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {achievement.description || "Chi tiết các cấp bậc của thành tích."}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-medium">Loại điểm:</span> {pointTypeLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Các cấp bậc</h2>
          {levelsSorted.length === 0 ? (
            <p className="text-sm text-gray-500">Thành tích này chưa được cấu hình cấp bậc.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levelsSorted.map((level) => {
                const isUnlocked = level.isUnlocked;
                const levelPointType = getPointTypeLabel(level.requiredPointTypeEnum, achievement.description);
                return (
                  <div
                    key={level.levelId}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      isUnlocked
                        ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
                        : "bg-gray-50 border-gray-200 opacity-70"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center">
                      {level.imageUrl ? (
                        <img
                          src={level.imageUrl}
                          alt={level.levelName}
                          className={`w-full h-full object-cover ${isUnlocked ? "" : "grayscale opacity-70"}`}
                        />
                      ) : (
                        <span className="text-lg">🎖️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${isUnlocked ? "text-purple-800" : "text-gray-700"}`}>
                        {level.levelName}
                      </div>
                      <div className="text-xs text-gray-600">
                        Cần tối thiểu {level.minPointsRequired ?? 0} {levelPointType}
                      </div>
                      {level.unlockedAt && (
                        <div className="text-xs text-green-600 mt-1">
                          Đã đạt: {new Date(level.unlockedAt).toLocaleString("vi-VN")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



