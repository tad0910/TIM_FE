import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../fontawesome";
import {
  getAllSchedulesByTeacher,
  type ClassModuleScheduleDTO,
} from "../services/scheduleApi";
import { getClassInfo } from "../services/classApi";
import type { ClassInfo } from "../types/class";
import {
  openAttendanceSession,
  markAttendance,
  getAttendanceStats,
  getAttendanceHistory,
  getAttendanceDetails,
  type AttendanceMarkDto,
  type AttendanceStatsDto,
  type AttendanceHistoryDto,
} from "../services/attendanceApi";
import { useAuthStore } from "../store/useAuthStore";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import NotificationPopup, {
  type Notification,
} from "../components/NotificationPopup";
import { parseBackendDate } from "../utils/timeFormat";

interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: {
    schedule: ClassModuleScheduleDTO;
  };
}

interface StudentAttendance {
  studentId: number;
  studentName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
  notes: string;
}

export default function AttendanceManagementPage() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<ClassModuleScheduleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ClassModuleScheduleDTO | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [, setClassInfo] = useState<ClassInfo | null>(null);
  const [studentsAttendance, setStudentsAttendance] = useState<
    StudentAttendance[]
  >([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionOpened, setSessionOpened] = useState(false);
  const [openNotesFor, setOpenNotesFor] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatsDto[]>(
    []
  );
  const [loadingStats, setLoadingStats] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AttendanceStatsDto;
    direction: "asc" | "desc";
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"stats" | "history">("stats");
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistoryDto[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [tempNotes, setTempNotes] = useState<Record<number, string>>({});

  const teacherId = useMemo(() => {
    const fromStore = Number(user?.id);
    if (Number.isFinite(fromStore)) return fromStore;
    const fromLocal = Number(localStorage.getItem("userId") || "");
    return Number.isFinite(fromLocal) ? fromLocal : null;
  }, [user?.id]);

  useEffect(() => {
    if (!teacherId) {
      setError("Không xác định được tài khoản giảng viên");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await getAllSchedulesByTeacher(teacherId);
        setSchedules(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("Failed to load teacher schedules", err);
        setError("Không thể tải danh sách lịch giảng dạy");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teacherId]);

  const availableClasses = useMemo(() => {
    const classMap = new Map<number, { id: number; name: string }>();
    schedules.forEach((schedule) => {
      if (!classMap.has(schedule.classId)) {
        classMap.set(schedule.classId, {
          id: schedule.classId,
          name: schedule.className || `Lớp ${schedule.classId}`,
        });
      }
    });
    return Array.from(classMap.values());
  }, [schedules]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return schedules.map((schedule) => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);

      const title = `${
        schedule.moduleName || `Module ${schedule.moduleId}`
      } - ${schedule.className || `Lớp ${schedule.classId}`}`;

      return {
        id: schedule.id.toString(),
        title,
        start: startDate,
        end: endDate,
        extendedProps: {
          schedule,
        },
        backgroundColor: "#4f46e5",
        borderColor: "#4338ca",
        textColor: "#ffffff",
      };
    });
  }, [schedules]);

  const loadAttendanceStats = async (classId: number) => {
    try {
      setLoadingStats(true);
      const stats = await getAttendanceStats(classId);
      setAttendanceStats(stats);
    } catch (err) {
      console.error("Failed to load attendance stats", err);
      setAttendanceStats([]);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadAttendanceHistory = async (classId: number) => {
    try {
      setLoadingHistory(true);
      const history = await getAttendanceHistory(classId);
      setAttendanceHistory(history);
    } catch (err) {
      console.error("Failed to load attendance history", err);
      setAttendanceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClassChange = (classId: number | null) => {
    setSelectedClassId(classId);
    if (classId) {
      if (activeTab === "stats") {
        loadAttendanceStats(classId);
      } else {
        loadAttendanceHistory(classId);
      }
    } else {
      setAttendanceStats([]);
      setAttendanceHistory([]);
    }
  };

  const handleTabChange = (tab: "stats" | "history") => {
    setActiveTab(tab);
    if (selectedClassId) {
      if (tab === "stats") {
        loadAttendanceStats(selectedClassId);
      } else {
        loadAttendanceHistory(selectedClassId);
      }
    }
  };

  const handleSort = (key: keyof AttendanceStatsDto) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedStats = useMemo(() => {
    if (!sortConfig) return attendanceStats;

    return [...attendanceStats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [attendanceStats, sortConfig]);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, AttendanceHistoryDto[]>();

    attendanceHistory.forEach((item) => {
      if (!item.sessionDatetime) return;

      const date = new Date(item.sessionDatetime);
      const dateKey = date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(item);
    });

    groups.forEach((items) => {
      items.sort((a, b) => {
        const dateA = a.sessionDatetime
          ? new Date(a.sessionDatetime).getTime()
          : 0;
        const dateB = b.sessionDatetime
          ? new Date(b.sessionDatetime).getTime()
          : 0;
        return dateB - dateA;
      });
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const dateA = a[1][0]?.sessionDatetime
        ? new Date(a[1][0].sessionDatetime).getTime()
        : 0;
      const dateB = b[1][0]?.sessionDatetime
        ? new Date(b[1][0].sessionDatetime).getTime()
        : 0;
      return dateB - dateA;
    });
  }, [attendanceHistory]);

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const schedule = (
      event.extendedProps as { schedule: ClassModuleScheduleDTO }
    ).schedule;
    setSelectedSchedule(schedule);
    setIsAttendanceModalOpen(true);
    setSessionOpened(false);

    await loadClassStudents(schedule.classId, schedule.id);
  };

  const loadClassStudents = async (classId: number, scheduleId: number) => {
    try {
      setLoadingStudents(true);
      const classData = await getClassInfo(classId);
      setClassInfo(classData);

      const students = classData.members
        .filter((m) => m.role === "sinh_vien")
        .map((member) => ({
          studentId: member.userId,
          studentName: member.user
            ? `${member.user.firstName || ""} ${
                member.user.lastName || ""
              }`.trim() ||
              member.user.username ||
              `Học viên ${member.userId}`
            : `Học viên ${member.userId}`,
          status: null as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null,
          notes: "",
        }));

      try {
        const attendanceDetails = await getAttendanceDetails(scheduleId);

        const studentsWithAttendance = students.map((student) => {
          const detail = attendanceDetails.find(
            (d) => d.studentId === student.studentId
          );
          if (detail && detail.status) {
            const statusUpper = detail.status.toUpperCase() as
              | "PRESENT"
              | "ABSENT"
              | "LATE"
              | "EXCUSED";

            return {
              ...student,
              status: statusUpper,
              notes: detail.notes ? String(detail.notes).trim() : "",
            };
          }
          return student;
        });

        setStudentsAttendance(studentsWithAttendance);

        const hasMarkedAttendance = attendanceDetails.some(
          (detail) => detail.status && detail.markedAt
        );
        if (hasMarkedAttendance) {
          setSessionOpened(true);
        }
      } catch (err) {
        console.log("No existing attendance details or API not available", err);
        setStudentsAttendance(students);
      }
    } catch (err) {
      console.error("Failed to load class students", err);
      setError("Không thể tải danh sách học viên");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenSession = async () => {
    if (!selectedSchedule || !teacherId) return;

    try {
      setSubmitting(true);
      await openAttendanceSession(selectedSchedule.id, teacherId);
      setSessionOpened(true);
      setError(null);
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: "Đã mở phiên điểm danh",
        duration: 3000,
      });
    } catch (err: any) {
      console.error("Failed to open attendance session", err);
      setError(err?.message || "Không thể mở phiên điểm danh");
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Lỗi",
        message: err?.message || "Không thể mở phiên điểm danh",
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (
    studentId: number,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  ) => {
    setStudentsAttendance((prev) =>
      prev.map((student) =>
        student.studentId === studentId ? { ...student, status } : student
      )
    );
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    setStudentsAttendance((prev) =>
      prev.map((student) =>
        student.studentId === studentId ? { ...student, notes } : student
      )
    );
  };

  const handleSubmitAttendance = async () => {
    if (!selectedSchedule || !teacherId) return;

    const unmarked = studentsAttendance.filter((s) => !s.status);
    if (unmarked.length > 0) {
      const errorMsg = `Vui lòng điểm danh cho tất cả học viên. Còn ${unmarked.length} học viên chưa được điểm danh.`;
      setError(errorMsg);
      setNotification({
        id: Date.now().toString(),
        type: "warning",
        title: "Cảnh báo",
        message: errorMsg,
        duration: 4000,
      });
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (!sessionOpened) {
        await openAttendanceSession(selectedSchedule.id, teacherId);
        setSessionOpened(true);
      }

      const records: AttendanceMarkDto[] = studentsAttendance.map(
        (student) => ({
          studentId: student.studentId,
          status: student.status!,
          notes: student.notes || undefined,
        })
      );

      await markAttendance(selectedSchedule.id, {
        teacherId,
        records,
      });

      setIsAttendanceModalOpen(false);
      setSelectedSchedule(null);
      setStudentsAttendance([]);
      setSessionOpened(false);

      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: `Đã lưu điểm danh cho ${records.length} học viên`,
        duration: 3000,
      });

      if (teacherId) {
        const data = await getAllSchedulesByTeacher(teacherId);
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error("Failed to mark attendance", err);
      const errorMsg = err?.message || "Không thể lưu điểm danh";
      setError(errorMsg);
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Lỗi",
        message: errorMsg,
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleNotes = (studentId: number) => {
    if (openNotesFor === studentId) {
      setOpenNotesFor(null);
      return;
    }

    const current = studentsAttendance.find(
      (s) => s.studentId === studentId
    );

    setTempNotes((prev) => ({
      ...prev,
      [studentId]: current?.notes ?? "",
    }));

    setOpenNotesFor(studentId);
  };

  const handleCloseModal = () => {
    setIsAttendanceModalOpen(false);
    setSelectedSchedule(null);
    setClassInfo(null);
    setStudentsAttendance([]);
    setSessionOpened(false);
    setOpenNotesFor(null);
    setError(null);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen py-8 px-4"
        style={{ backgroundColor: "#F2F4F7" }}
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Quản lý điểm danh
          </h1>
          <p className="text-gray-600 mb-6">
            Đang tải các lịch giảng dạy của bạn...
          </p>
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: "#F2F4F7" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý điểm danh
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          <div className="flex-[0_0_70%] bg-white rounded-2xl shadow overflow-hidden p-6">
            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  Hiện chưa có lịch giảng dạy nào được phân công cho bạn.
                </p>
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                locale={viLocale}
                height="auto"
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                eventDisplay="block"
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  meridiem: false,
                }}
                buttonText={{
                  today: "Hôm nay",
                  month: "Tháng",
                  week: "Tuần",
                  day: "Ngày",
                }}
                dayHeaderFormat={{
                  weekday: "long",
                }}
              />
            )}
          </div>

          <div className="flex-[0_0_30%] bg-white rounded-2xl shadow overflow-hidden flex flex-col max-h-[800px]">
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handleTabChange("stats")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "stats"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Thống kê
                </button>
                <button
                  onClick={() => handleTabChange("history")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "history"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Lịch sử
                </button>
              </div>
              <select
                value={selectedClassId || ""}
                onChange={(e) =>
                  handleClassChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value=""> Chọn lớp </option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto p-4 pr-2 flex-1 min-h-0">
              {!selectedClassId ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Vui lòng chọn lớp để xem{" "}
                  {activeTab === "stats" ? "thống kê" : "lịch sử"}
                </div>
              ) : activeTab === "stats" ? (
                <>
                  {loadingStats ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                      <p className="text-gray-600 text-sm">
                        Đang tải thống kê...
                      </p>
                    </div>
                  ) : sortedStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Chưa có dữ liệu điểm danh cho lớp này
                    </div>
                  ) : (
                    <div className="space-y-3 pr-2">
                      {sortedStats.map((stat) => {
                        const rate = stat.attendanceRate ?? 0;
                        const rateColor =
                          rate >= 80
                            ? "bg-green-500"
                            : rate >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500";

                        return (
                          <div
                            key={stat.studentId}
                            className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-gray-900 text-sm flex-1">
                                {stat.studentName}
                              </p>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  rate >= 80
                                    ? "bg-green-100 text-green-700"
                                    : rate >= 60
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {rate.toFixed(1)}%
                              </span>
                            </div>

                            <div className="mb-2">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>
                                  {stat.attendedCount}/{stat.totalSessions} buổi
                                </span>
                                <span>{rate.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${rateColor} transition-all`}
                                  style={{ width: `${Math.min(rate, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                      <p className="text-gray-600 text-sm">
                        Đang tải lịch sử...
                      </p>
                    </div>
                  ) : groupedHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Chưa có lịch sử điểm danh cho lớp này
                    </div>
                  ) : (
                    <div className="space-y-6 pr-2">
                      {groupedHistory.map(([dateKey, items]) => (
                        <div key={dateKey}>
                          <div className="sticky top-0 bg-white py-2 mb-3 border-b border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {dateKey}
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {items.map((item) => {
                              const sessionDate = item.sessionDatetime
                                ? new Date(item.sessionDatetime)
                                : null;
                              const timeStr = sessionDate
                                ? sessionDate.toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "";

                              return (
                                <div
                                  key={item.scheduleId}
                                  className="border-l-2 border-indigo-200 pl-3 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.moduleName}
                                      </p>
                                      {item.sessionTitle && (
                                        <p className="text-xs text-gray-600 mt-0.5">
                                          {item.sessionTitle}
                                          {item.sessionNumber &&
                                            ` - Buổi ${item.sessionNumber}`}
                                        </p>
                                      )}
                                    </div>
                                    {item.isLate && (
                                      <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                        Muộn
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    {timeStr && (
                                      <span className="flex items-center gap-1">
                                        <FontAwesomeIcon
                                          icon={["fas", "clock"]}
                                          className="w-3 h-3"
                                        />
                                        {timeStr}
                                      </span>
                                    )}
                                    {item.openedByName && (
                                      <span className="flex items-center gap-1">
                                        <FontAwesomeIcon
                                          icon={["fas", "user"]}
                                          className="w-3 h-3"
                                        />
                                        {item.openedByName}
                                      </span>
                                    )}
                                  </div>

                                  {item.openedAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Mở:{" "}
                                      {parseBackendDate(item.openedAt)?.toLocaleString(
                                        "vi-VN",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedClassId &&
              activeTab === "stats" &&
              sortedStats.length > 0 && (
                <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sắp xếp:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSort("attendanceRate")}
                        className={`px-2 py-1 rounded text-xs ${
                          sortConfig?.key === "attendanceRate"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        title="Sắp xếp theo tỷ lệ"
                      >
                        Tỷ lệ
                      </button>
                      <button
                        onClick={() => handleSort("studentName")}
                        className={`px-2 py-1 rounded text-xs ${
                          sortConfig?.key === "studentName"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        title="Sắp xếp theo tên"
                      >
                        Tên
                      </button>
                    </div>
                  </div>
                  {sortConfig && (
                    <p className="text-xs text-gray-500 mt-1">
                      {sortConfig.key === "attendanceRate" ? "Tỷ lệ" : "Tên"}:{" "}
                      {sortConfig.direction === "asc" ? "Tăng dần" : "Giảm dần"}
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      <Dialog
        open={isAttendanceModalOpen}
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
              <Dialog.Title className="text-lg font-semibold tracking-wide">
                Điểm danh buổi học
              </Dialog.Title>
              <button
                onClick={handleCloseModal}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-6 bg-gray-50">
              {selectedSchedule && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-shrink-0 space-y-4 mb-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold">
                            i
                          </span>
                          <span>Thông tin buổi học</span>
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                          {selectedSchedule.moduleName || `Module ${selectedSchedule.moduleId}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Lớp
                          </p>
                          <p className="font-semibold text-gray-900">
                            {selectedSchedule.className || `Lớp ${selectedSchedule.classId}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Module
                          </p>
                          <p className="font-semibold text-gray-900">
                            {selectedSchedule.moduleName || `Module ${selectedSchedule.moduleId}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Bắt đầu
                          </p>
                          <p className="font-medium text-gray-900">
                            {selectedSchedule.startDate
                              ? parseBackendDate(selectedSchedule.startDate)?.toLocaleString("vi-VN") || "—"
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Kết thúc
                          </p>
                          <p className="font-medium text-gray-900">
                            {selectedSchedule.endDate
                              ? parseBackendDate(selectedSchedule.endDate)?.toLocaleString("vi-VN") || "—"
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                      </div>
                    )}
                  </div>

                  {loadingStudents ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-600">
                          Đang tải danh sách học viên...
                        </p>
                      </div>
                    </div>
                  ) : studentsAttendance.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        Không có học viên trong lớp này.
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between w-full mb-4 flex-shrink-0">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Danh sách học viên ({studentsAttendance.length})
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Chọn trạng thái cho từng học viên, có thể thêm ghi chú nếu cần.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!sessionOpened && (
                            <button
                              onClick={handleOpenSession}
                              disabled={submitting}
                              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {submitting ? "Đang mở..." : "Mở phiên điểm danh"}
                            </button>
                          )}
                          {sessionOpened && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                              <span className="text-base leading-none">✓</span>
                              <span>Phiên đang mở</span>
                            </span>
                          )}
                          <button
                            onClick={handleSubmitAttendance}
                            disabled={submitting || !sessionOpened || studentsAttendance.some((s) => !s.status)}
                            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {submitting ? "Đang lưu..." : "Lưu điểm danh"}
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {studentsAttendance.map((student) => (
                          <div
                            key={student.studentId}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {student.studentName}
                                </p>
                                {student.notes && (
                                  <p className="text-xs italic text-gray-500 mt-1 line-clamp-2">
                                    {student.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      student.studentId,
                                      "PRESENT"
                                    )
                                  }
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    student.status === "PRESENT"
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                      : "bg-emerald-50 text-emerald-700 border-transparent hover:bg-emerald-100"
                                  }`}
                                >
                                  Có mặt
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      student.studentId,
                                      "ABSENT"
                                    )
                                  }
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    student.status === "ABSENT"
                                      ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                      : "bg-rose-50 text-rose-700 border-transparent hover:bg-rose-100"
                                  }`}
                                >
                                  Vắng
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      student.studentId,
                                      "LATE"
                                    )
                                  }
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    student.status === "LATE"
                                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                      : "bg-amber-50 text-amber-700 border-transparent hover:bg-amber-100"
                                  }`}
                                >
                                  Muộn
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      student.studentId,
                                      "EXCUSED"
                                    )
                                  }
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                    student.status === "EXCUSED"
                                      ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                      : "bg-sky-50 text-sky-700 border-transparent hover:bg-sky-100"
                                  }`}
                                >
                                  Có phép
                                </button>
                                <button
                                  onClick={() =>
                                    handleToggleNotes(student.studentId)
                                  }
                                  className={`p-2 rounded-full border text-xs ${
                                    openNotesFor === student.studentId
                                      ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                  } transition-colors`}
                                  title="Ghi chú"
                                >
                                  <FontAwesomeIcon
                                    icon={["fas", "pen"]}
                                    className="w-4 h-4"
                                  />
                                </button>
                              </div>
                            </div>
                            {openNotesFor === student.studentId && (
                              <div className="mt-3">
                                <input
                                  type="text"
                                  placeholder="Ghi chú (tùy chọn)"
                                  value={
                                    tempNotes[student.studentId] ??
                                    student.notes ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setTempNotes((prev) => ({
                                      ...prev,
                                      [student.studentId]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const value =
                                        tempNotes[student.studentId] ?? "";
                                      handleNotesChange(student.studentId, value);
                                      setOpenNotesFor(null);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/80"
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <NotificationPopup
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
