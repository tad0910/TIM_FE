import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import AttendancePageSkeleton from "../../../components/AttendancePageSkeleton";
import {
  getAttendanceDetails,
  getAttendanceHistory,
  getAttendanceRecords,
  getAttendanceStats,
  type AttendanceDetailDto,
  type AttendanceHistoryDto,
  type AttendanceRecord,
} from "../../../services/attendanceApi";
import {
  getSchedulesByClass,
  type ClassModuleScheduleDTO,
} from "../../../services/scheduleApi";

type Props = {
  classId: number | null;
  isActive?: boolean;
};

type AttendanceMap<T> = Record<number, T>;

export default function ClassAttendanceSection({
  classId,
  isActive = true,
}: Props) {
  const [expandedSchedules, setExpandedSchedules] = useState<Set<number>>(
    new Set()
  );
  const [attendanceDetails, setAttendanceDetails] = useState<
    AttendanceMap<AttendanceDetailDto[]>
  >({});
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceMap<AttendanceRecord[]>
  >({});
  const [loadingDetailIds, setLoadingDetailIds] = useState<Set<number>>(
    new Set()
  );

  const numericClassId = typeof classId === "number" ? classId : null;
  const shouldFetch = Boolean(isActive && numericClassId);
  const hasLoadedRef = useRef(false);

  const schedulesQuery = useQuery({
    queryKey: ["class-attendance", "schedules", numericClassId],
    queryFn: () => getSchedulesByClass(numericClassId!),
    enabled: shouldFetch,
    staleTime: 60_000,
  });

  const statsQuery = useQuery({
    queryKey: ["class-attendance", "stats", numericClassId],
    queryFn: () => getAttendanceStats(numericClassId!),
    enabled: shouldFetch,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ["class-attendance", "history", numericClassId],
    queryFn: () => getAttendanceHistory(numericClassId!),
    enabled: shouldFetch,
    staleTime: 60_000,
  });

  const schedules = schedulesQuery.data ?? [];
  const stats = statsQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const initialLoading =
    shouldFetch &&
    !hasLoadedRef.current &&
    (schedulesQuery.isLoading ||
      statsQuery.isLoading ||
      historyQuery.isLoading);

  useEffect(() => {
    if (
      shouldFetch &&
      (schedulesQuery.data || statsQuery.data || historyQuery.data)
    ) {
      hasLoadedRef.current = true;
    }
  }, [
    shouldFetch,
    schedulesQuery.data,
    statsQuery.data,
    historyQuery.data,
  ]);

  useEffect(() => {
    setExpandedSchedules(new Set());
    setAttendanceDetails({});
    setAttendanceRecords({});
    setLoadingDetailIds(new Set());
    hasLoadedRef.current = false;
  }, [numericClassId]);

  const setDetailLoading = useCallback((scheduleId: number, loading: boolean) => {
    setLoadingDetailIds((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(scheduleId);
      } else {
        next.delete(scheduleId);
      }
      return next;
    });
  }, []);

  const loadScheduleDetails = useCallback(
    async (scheduleId: number) => {
      if (attendanceDetails[scheduleId]) return;
      try {
        setDetailLoading(scheduleId, true);
        const details = await getAttendanceDetails(scheduleId);
        setAttendanceDetails((prev) => ({
          ...prev,
          [scheduleId]: Array.isArray(details) ? details : [],
        }));
      } finally {
        setDetailLoading(scheduleId, false);
      }
    },
    [attendanceDetails, setDetailLoading]
  );

  const loadScheduleRecords = useCallback(
    async (scheduleId: number) => {
      if (attendanceRecords[scheduleId]) return;
      try {
        setDetailLoading(scheduleId, true);
        const records = await getAttendanceRecords(scheduleId);
        setAttendanceRecords((prev) => ({
          ...prev,
          [scheduleId]: Array.isArray(records) ? records : [],
        }));
      } finally {
        setDetailLoading(scheduleId, false);
      }
    },
    [attendanceRecords, setDetailLoading]
  );

  const handleToggleSchedule = useCallback(
    (scheduleId: number) => {
      setExpandedSchedules((prev) => {
        const next = new Set(prev);
        if (next.has(scheduleId)) {
          next.delete(scheduleId);
        } else {
          next.add(scheduleId);
          void loadScheduleDetails(scheduleId);
          void loadScheduleRecords(scheduleId);
        }
        return next;
      });
    },
    [loadScheduleDetails, loadScheduleRecords]
  );

  const summaryCards = useMemo(() => {
    const totalSessions = schedules.length;
    const studentCount = stats.length;
    const totalAttendance = history.length;
    const avgAttendanceRate =
      stats.length > 0
        ? (
            stats.reduce(
              (acc, curr) => acc + (curr.attendanceRate ?? 0),
              0
            ) / stats.length
          ).toFixed(0)
        : null;

    return [
      {
        label: "Tổng phiên điểm danh",
        value: totalSessions,
      },
      {
        label: "Số lượng học viên",
        value: studentCount,
      },
      {
        label: "Tổng lượt điểm danh",
        value: totalAttendance,
      },
      {
        label: "Tỉ lệ tham gia trung bình",
        value: avgAttendanceRate ? `${avgAttendanceRate}%` : "—",
      },
    ];
  }, [schedules.length, stats, history.length]);

  if (!shouldFetch) {
    return null;
  }

  if (initialLoading) {
    return <AttendancePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm w-full">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Thống kê tỉ lệ điểm danh
            </h3>
            {statsQuery.isFetching && (
              <span className="text-xs text-slate-400">Đang cập nhật…</span>
            )}
          </div>
          {stats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Không có dữ liệu
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {stats.slice(0, 12).map((s) => (
                <div
                  key={s.studentId}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900 truncate">
                    {s.studentName}
                  </span>
                  <span className="text-teal-700 font-semibold">
                    {(s.attendanceRate ?? 0).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Lịch sử điểm danh
            </h2>
            <p className="text-xs text-slate-500">
              Danh sách những buổi điểm danh gần nhất của lớp
            </p>
          </div>
          {historyQuery.isFetching && (
            <span className="text-xs text-slate-400">Đang cập nhật…</span>
          )}
        </div>

        {historyQuery.isLoading ? (
          <div className="px-6 py-8">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Không có lịch sử điểm danh cho lớp này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Buổi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.map((entry, idx) => {
                  const schedule = schedules.find(
                    (s) => s.id === entry.scheduleId
                  );
                  const expanded = expandedSchedules.has(entry.scheduleId);
                  const detailLoading = loadingDetailIds.has(entry.scheduleId);

                  return (
                    <FragmentRow
                      key={`${entry.scheduleId}-${idx}`}
                      entry={entry}
                      schedule={schedule}
                      expanded={expanded}
                      detailLoading={detailLoading}
                      attendanceDetails={attendanceDetails}
                      attendanceRecords={attendanceRecords}
                      onToggle={() => handleToggleSchedule(entry.scheduleId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type FragmentRowProps = {
  entry: AttendanceHistoryDto;
  schedule?: ClassModuleScheduleDTO;
  expanded: boolean;
  detailLoading: boolean;
  attendanceDetails: AttendanceMap<AttendanceDetailDto[]>;
  attendanceRecords: AttendanceMap<AttendanceRecord[]>;
  onToggle: () => void;
};

function FragmentRow({
  entry,
  schedule,
  expanded,
  detailLoading,
  attendanceDetails,
  attendanceRecords,
  onToggle,
}: FragmentRowProps) {
  const scheduleId = entry.scheduleId;
  const details = attendanceDetails[scheduleId] ?? [];
  const records = attendanceRecords[scheduleId] ?? [];

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4 text-sm font-medium text-slate-900">
          {entry.moduleName}
        </td>
        <td className="px-6 py-4 text-sm text-slate-900">
          {entry.sessionTitle || "-"}{" "}
          {entry.sessionNumber ? `(Buổi ${entry.sessionNumber})` : ""}
        </td>
        <td className="px-6 py-4 text-sm text-slate-600">
          {entry.sessionDatetime
            ? new Date(entry.sessionDatetime).toLocaleString("vi-VN")
            : "-"}
        </td>
        <td className="px-6 py-4 text-center">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center justify-center rounded-full p-2 text-teal-600 transition hover:bg-teal-50 hover:text-teal-800"
            title="Xem chi tiết"
          >
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={4} className="bg-slate-50 px-6 py-6">
            {detailLoading && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Đang tải chi tiết buổi điểm danh...
              </div>
            )}

            {!detailLoading && (
              <div className="space-y-4">
                {details.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <colgroup>
                          <col className="w-1/4" />
                          <col className="w-1/4" />
                          <col className="w-1/2" />
                        </colgroup>
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Tên học viên
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Trạng thái
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ghi chú
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {details.map((student) => (
                            <tr key={student.studentId}>
                              <td className="px-4 py-2 font-medium text-slate-900 align-top">
                                {student.studentName}
                              </td>
                              <td className="px-4 py-2 align-top">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadgeClass(
                                    student.status
                                  )}`}
                                >
                                  {statusLabel(student.status)}
                                </span>
                              </td>
                              <td className="px-4 py-2 align-top text-xs text-slate-600">
                                {student.notes ? student.notes : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Bản ghi điểm danh
                      </h4>
                      {schedule?.instructorName && (
                        <p className="text-xs text-slate-500">
                          Giáo viên phụ trách: {schedule.instructorName}
                        </p>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <colgroup>
                          <col className="w-1/4" />
                          <col className="w-1/4" />
                          <col className="w-1/2" />
                        </colgroup>
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Sinh viên
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Trạng thái
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ghi chú
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {records.map((record) => (
                            <tr key={record.id}>
                              <td className="px-4 py-2 text-slate-900 align-top">
                                Sinh viên {record.studentId}
                              </td>
                              <td className="px-4 py-2 align-top">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadgeClass(
                                    record.status
                                  )}`}
                                >
                                  {statusLabel(record.status)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-600 align-top text-xs">
                                {record.notes ? record.notes : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {details.length === 0 && records.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có chi tiết cho buổi điểm danh này.
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function statusBadgeClass(status?: string | null) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700";
    case "absent":
      return "bg-rose-50 text-rose-700";
    case "late":
      return "bg-amber-50 text-amber-700";
    case "excused":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "present":
      return "Có mặt";
    case "absent":
      return "Vắng";
    case "late":
      return "Muộn";
    case "excused":
      return "Có phép";
    default:
      return "Chưa xác định";
  }
}
