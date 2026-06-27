import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  getMyGamificationStats,
  getMyPointLogsPage,
  type UserGamificationStats,
  type UserPointLog,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import TableSkeleton from "../../../components/TableSkeleton";
import Pagination from "../../../components/Pagination";

type PointFilter = "all" | "diligence" | "competence" | "experience";

export default function CompetencyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const historyRef = useRef<HTMLDivElement | null>(null);
  const lastAppliedLocationKey = useRef<string | null>(null);
  const [logsPage, setLogsPage] = useState(0);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [selectedPointType, setSelectedPointType] = useState<PointFilter>(() => {
    const incomingType = (location.state as { pointType?: PointFilter } | null)
      ?.pointType;
    return incomingType || "all";
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const incomingType = (location.state as { pointType?: PointFilter } | null)
      ?.pointType;
    if (incomingType && lastAppliedLocationKey.current !== location.key) {
      setSelectedPointType(incomingType);
      lastAppliedLocationKey.current = location.key;
    }
  }, [location.key, location.state]);

  // React Query: Fetch gamification stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery<UserGamificationStats>({
    queryKey: queryKeys.gamification.myStats(),
    queryFn: () => getMyGamificationStats(),
    enabled: Boolean(isAuthenticated && user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch point logs (fetch all, then paginate client-side)
  const {
    data: pointLogsResponse,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: queryKeys.gamification.myPointLogs({ page: 0, size: 500 }),
    queryFn: () => getMyPointLogsPage(0, 500),
    enabled: Boolean(isAuthenticated && user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const allPointLogs = pointLogsResponse?.content || [];

  const formatPoints = (value?: number) => {
    if (typeof value === "number") {
      return value.toLocaleString("vi-VN");
    }
    return "—";
  };

  const filteredPointLogs = useMemo(() => {
    if (selectedPointType === "all") return allPointLogs;
    return allPointLogs.filter((log) => {
      if (selectedPointType === "diligence") {
        return !!log.pointsDiligenceEarned;
      }
      if (selectedPointType === "competence") {
        return !!log.pointsCompetenceEarned;
      }
      return !!log.pointsExperienceEarned;
    });
  }, [allPointLogs, selectedPointType]);

  const pagedPointLogs = useMemo(() => {
    const start = logsPage * logsPageSize;
    const end = start + logsPageSize;
    return filteredPointLogs.slice(start, end);
  }, [filteredPointLogs, logsPage, logsPageSize]);

  const logsTotalElements = filteredPointLogs.length;
  const logsTotalPages = logsTotalElements ? Math.ceil(logsTotalElements / logsPageSize) : 0;

  useEffect(() => {
    if (logsPage >= logsTotalPages && logsTotalPages > 0) {
      setLogsPage(logsTotalPages - 1);
    }
  }, [logsPage, logsTotalPages]);

  const pointTypeLabels: Record<PointFilter, string> = {
    all: "Tất cả điểm thưởng",
    diligence: "Điểm chuyên cần",
    competence: "Điểm năng lực",
    experience: "Điểm kinh nghiệm",
  };

  const handleSelectPointType = (type: PointFilter) => {
    setSelectedPointType(type);
    if (historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLogsPageChange = (page: number) => {
    setLogsPage(page);
  };

  const handleLogsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setLogsPageSize(newSize);
    setLogsPage(0);
  };

  const renderPointsByType = (log: UserPointLog) => {
    switch (selectedPointType) {
      case "diligence":
        return log.pointsDiligenceEarned ? `+${log.pointsDiligenceEarned}` : "—";
      case "competence":
        return log.pointsCompetenceEarned
          ? `+${log.pointsCompetenceEarned}`
          : "—";
      case "experience":
        return log.pointsExperienceEarned
          ? `+${log.pointsExperienceEarned}`
          : "—";
      default:
        return null;
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const rewardItems: {
    label: string;
    value?: number;
    icon: IconProp;
    description: string;
    key: PointFilter;
  }[] = [
    {
      label: "Điểm chuyên cần",
      value: stats?.totalDiligence,
      icon: ["fas", "clock"],
      description: "Tích lũy qua mức độ chuyên cần",
      key: "diligence",
    },
    {
      label: "Điểm năng lực",
      value: stats?.totalCompetence,
      icon: ["fas", "brain"],
      description: "Phản ánh kỹ năng và năng lực",
      key: "competence",
    },
    {
      label: "Điểm kinh nghiệm",
      value: stats?.totalExperience,
      icon: ["fas", "book-open"],
      description: "Thể hiện trải nghiệm và đóng góp",
      key: "experience",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wide">
                Năng lực học tập
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                Tổng quan điểm thưởng
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Bấm vào từng loại điểm để lọc lịch sử bên dưới.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rewardItems.map((item) => {
              const isActive = selectedPointType === item.key;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSelectPointType(item.key)}
                  className={`text-left rounded-xl border p-4 shadow-sm transition-colors ${
                    isActive
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-indigo-50 bg-indigo-50/70 hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                      <FontAwesomeIcon
                        icon={item.icon}
                        className="text-indigo-600 w-4 h-4"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {item.label}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading && !stats ? "--" : formatPoints(item.value)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{item.description}</p>
                </button>
              );
            })}
          </div>

          {!statsLoading && !stats && (
            <p className="text-center text-sm text-gray-500">
              Chưa có dữ liệu điểm thưởng. Hãy tham gia các hoạt động học tập để tích lũy nhé!
            </p>
          )}
        </div>

        <div ref={historyRef} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wide">
                  Lịch sử điểm
                </p>
                <h3 className="text-xl font-bold text-gray-900">
                  {pointTypeLabels[selectedPointType]}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Ghi nhận chi tiết quá trình cộng điểm của bạn.
                </p>
              </div>
              <div className="flex gap-2">
                {selectedPointType !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedPointType("all")}
                    className="self-start px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mỗi trang</span>
                <select
                  value={logsPageSize}
                  onChange={handleLogsPageSizeChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <TableSkeleton rows={5} columns={selectedPointType === "all" ? 5 : 3} />
          ) : pagedPointLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành vi
                    </th>
                    {selectedPointType === "all" ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm chuyên cần
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm năng lực
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Điểm kinh nghiệm
                        </th>
                      </>
                    ) : (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {pointTypeLabels[selectedPointType]}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  {pagedPointLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">
                        {log.behaviorName || "—"}
                      </td>
                      {selectedPointType === "all" ? (
                        <>
                          <td className="px-6 py-4 text-gray-900">
                            {log.pointsDiligenceEarned ? `+${log.pointsDiligenceEarned}` : "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {log.pointsCompetenceEarned ? `+${log.pointsCompetenceEarned}` : "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {log.pointsExperienceEarned ? `+${log.pointsExperienceEarned}` : "—"}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 text-gray-900">
                          {renderPointsByType(log)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <Pagination
                  currentPage={logsPage}
                  totalPages={logsTotalPages}
                  totalElements={logsTotalElements}
                  pageSize={logsPageSize}
                  onPageChange={handleLogsPageChange}
                  itemName="lịch sử điểm"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Chưa có lịch sử điểm</div>
          )}
        </div>
      </div>
    </div>
  );
}
