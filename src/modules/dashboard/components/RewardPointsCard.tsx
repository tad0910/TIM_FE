import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  getMyGamificationStats,
  type UserGamificationStats,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";

export default function RewardPointsCard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={["fas", "star"]} className="text-[#1E3A8A] w-4 h-4" />
          <h3 className="font-bold text-gray-900 text-lg">Điểm thưởng</h3>
        </div>
        {isLoadingStats && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Đang tải...</span>
        )}
      </div>

      <div className="space-y-3 mt-5">
        <button
          type="button"
          onClick={() => navigate("/profile/reward-points")}
          className="flex w-full items-center justify-between text-left p-3 rounded-xl hover:bg-green-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
              <FontAwesomeIcon icon={["fas", "clock"]} className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-medium text-gray-700 group-hover:text-green-800 transition-colors">Điểm chuyên cần</span>
          </div>
          <span className="text-lg font-bold text-gray-900 group-hover:text-green-700">
            {formatPoints(gamificationStats?.totalDiligence)}
          </span>
        </button>
        
        <button
          type="button"
          onClick={() => navigate("/profile/reward-points")}
          className="flex w-full items-center justify-between text-left p-3 rounded-xl hover:bg-blue-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <FontAwesomeIcon icon={["fas", "brain"]} className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-medium text-gray-700 group-hover:text-blue-800 transition-colors">Điểm năng lực</span>
          </div>
          <span className="text-lg font-bold text-gray-900 group-hover:text-blue-700">
            {formatPoints(gamificationStats?.totalCompetence)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile/reward-points")}
          className="flex w-full items-center justify-between text-left p-3 rounded-xl hover:bg-amber-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200 transition-colors">
              <FontAwesomeIcon icon={["fas", "book-open"]} className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-medium text-gray-700 group-hover:text-amber-800 transition-colors">Điểm kinh nghiệm</span>
          </div>
          <span className="text-lg font-bold text-gray-900 group-hover:text-amber-700">
            {formatPoints(gamificationStats?.totalExperience)}
          </span>
        </button>
      </div>

      {!isLoadingStats && !gamificationStats && (
        <p className="text-sm text-gray-500 mt-5 text-center bg-gray-50 py-3 rounded-xl border border-dashed border-gray-200">
          Chưa có dữ liệu điểm thưởng.
        </p>
      )}
    </div>
  );
}
