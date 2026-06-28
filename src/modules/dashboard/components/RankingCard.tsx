import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";
import {
  getCurrentRanking,
  getMonthlyRanking,
  type RankingItem,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";

type Tab = "all" | "monthly";

function getRankColor(rank: number) {
  if (rank === 1) return "bg-yellow-400 text-white";
  if (rank === 2) return "bg-green-500 text-white";
  if (rank === 3) return "bg-orange-500 text-white";
  return "bg-gray-200 text-gray-700";
}

export default function RankingCard() {
  const order: Tab[] = ["all", "monthly"];
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  
  const currentMonthYear = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }, []);

  // React Query: Fetch current ranking
  const {
    data: currentRankingData,
    isLoading: currentLoading,
    error: currentError,
    refetch: refetchCurrent,
  } = useQuery({
    queryKey: queryKeys.gamification.ranking.current({ size: 10 }),
    queryFn: () => getCurrentRanking({ size: 10 }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch monthly ranking
  const {
    data: monthlyRankingData,
    isLoading: monthlyLoading,
    error: monthlyError,
    refetch: refetchMonthly,
  } = useQuery({
    queryKey: queryKeys.gamification.ranking.monthly({ monthYear: currentMonthYear, size: 10 }),
    queryFn: () => getMonthlyRanking({ monthYear: currentMonthYear, size: 10 }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rankingsByTab: Record<Tab, RankingItem[]> = useMemo(() => ({
    all: currentRankingData?.rankings || [],
    monthly: monthlyRankingData?.rankings || [],
  }), [currentRankingData, monthlyRankingData]);

  const loading = tab === "all" ? currentLoading : monthlyLoading;
  const error = tab === "all" ? (currentError ? "Không thể tải bảng xếp hạng" : null) : (monthlyError ? "Không thể tải bảng xếp hạng" : null);

  const fetchRanking = () => {
    if (tab === "all") {
      refetchCurrent();
    } else {
      refetchMonthly();
    }
  };

  const goTab = (target: Tab) => {
    if (tab === target) return;
    setExpanded(false);
    setTab(target);
  };

  const items = useMemo(() => {
    return (rankingsByTab[tab] || []).map(
      (item: RankingItem, index: number) => ({
        ...item,
        rank: item.rankPosition ?? index + 1,
        name: item.displayName || item.username || "Ẩn danh",
        experienceScore: item.totalExperienceScore ?? 0,
      })
    );
  }, [rankingsByTab, tab]);

  const visibleItems = useMemo(() => {
    return items.slice(0, expanded ? 10 : 5);
  }, [items, expanded]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600">
          <FontAwesomeIcon icon={["fas", "trophy"]} />
        </span>
        <h3 className="font-semibold">Bảng xếp hạng</h3>
        <div className="flex justify-center w-full gap-1 text-xs">
          {order.map((t) => (
            <button
              key={t}
              onClick={() => goTab(t)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                tab === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t === "all" ? "Tất cả" : "Tháng này"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
          {error}
        </div>
      )}

      <ul className="divide-y">
        {loading &&
          items.length === 0 &&
          Array.from({ length: 3 }).map((_, idx) => (
            <li key={`skeleton-${idx}`} className="py-2">
              <div className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="inline-flex w-7 h-7 rounded-full bg-gray-200" />
                  <span className="h-3 w-24 bg-gray-200 rounded" />
                </div>
                <span className="h-3 w-12 bg-gray-200 rounded" />
              </div>
            </li>
          ))}

        {!loading && items.length === 0 && !error && (
          <li className="py-4 text-center text-sm text-gray-500">
            Chưa có dữ liệu xếp hạng.
          </li>
        )}

        {visibleItems.map((it) => (
          <li
            key={`${it.userId}-${it.rank}`}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${getRankColor(
                  it.rank
                )}`}
              >
                {it.rank}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{it.name}</p>
                {it.className && (
                  <p className="text-xs text-gray-500 truncate">
                    {it.className}
                  </p>
                )}
              </div>
            </div>
            <span className="text-gray-600 whitespace-nowrap font-medium">
              {it.experienceScore.toLocaleString("vi-VN")} XP
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        {items.length > 5 && (
          <button
            type="button"
            className="text-xs text-blue-500 hover:text-blue-600"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Thu gọn top 5" : "Xem top 10"}
          </button>
        )}
        <button
          type="button"
          onClick={fetchRanking}
          className="ml-auto text-xs text-blue-500 hover:text-blue-600"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>
    </div>
  );
}
