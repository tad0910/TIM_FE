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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600">
            <FontAwesomeIcon icon={["fas", "star"]} />
          </span>
          <h3 className="font-bold text-gray-800">Điểm thưởng</h3>
        </div>
        {isLoadingStats && (
          <span className="text-xs text-gray-500">Đang tải...</span>
        )}
      </div>

      <div className="space-y-2 mt-4">
        <button
          type="button"
          onClick={() => navigate("/competency", { state: { pointType: "diligence" } })}
          className="flex w-full items-center justify-between text-left p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FontAwesomeIcon icon={["fas", "clock"]} className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-medium text-gray-800">Điểm chuyên cần</span>
          </div>
          <span className="text-[15px] font-bold text-gray-900">
            {formatPoints(gamificationStats?.totalDiligence)}
          </span>
        </button>
        
        <button
          type="button"
          onClick={() => navigate("/competency", { state: { pointType: "competence" } })}
          className="flex w-full items-center justify-between text-left p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FontAwesomeIcon icon={["fas", "brain"]} className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-medium text-gray-800">Điểm năng lực</span>
          </div>
          <span className="text-[15px] font-bold text-gray-900">
            {formatPoints(gamificationStats?.totalCompetence)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/competency", { state: { pointType: "experience" } })}
          className="flex w-full items-center justify-between text-left p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FontAwesomeIcon icon={["fas", "book-open"]} className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-medium text-gray-800">Điểm kinh nghiệm</span>
          </div>
          <span className="text-[15px] font-bold text-gray-900">
            {formatPoints(gamificationStats?.totalExperience)}
          </span>
        </button>
      </div>

      {!isLoadingStats && !gamificationStats && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Chưa có dữ liệu điểm thưởng.
        </p>
      )}
    </div>
  );
}
