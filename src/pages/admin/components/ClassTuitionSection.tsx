import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { JSX } from "react";

import AssignStudentTuitionModal from "../AssignStudentTuitionModal";
import StudentTuitionDetailModal from "../StudentTuitionDetailModal";
import useClassTuition from "../../../hooks/useClassTuition";
import type { ClassInfo, Member } from "../../../types/class";

type ClassTuitionSectionProps = {
  classInfo: ClassInfo;
  numericClassId: number | null;
  programIdForClass: number | null;
};

export default function ClassTuitionSection({
  classInfo,
  numericClassId,
  programIdForClass,
}: ClassTuitionSectionProps) {
  const members = (classInfo?.members as Member[] | undefined) ?? [];
  const {
    students,
    loading,
    error,
    refetch,
  } = useClassTuition(numericClassId, members);

  const [searchTerm, setSearchTerm] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const filteredStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(keyword)
    );
  }, [students, searchTerm]);

  const handleOpenAssign = (student: { id: number; name: string }) => {
    setSelectedStudent(student);
    setAssignOpen(true);
  };

  const handleOpenDetail = (student: { id: number; name: string }) => {
    setDetailStudent(student);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Gán học phí cho học viên
          </h2>
          <p className="text-sm text-slate-500">
            Theo dõi tình trạng đóng học phí và gán lộ trình cho từng học viên.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              placeholder="Tìm tên học viên..."
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          {students.length === 0
            ? "Chưa có học viên nào trong lớp."
            : "Không tìm thấy học viên phù hợp với từ khóa."}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    STT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Học viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kỳ hiện tại
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.userId}
                    className="hover:bg-slate-50"
                    onClick={() =>
                      handleOpenDetail({
                        id: student.userId,
                        name: student.name,
                      })
                    }
                  >
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {student.email || "—"}
                    </td>
                    <td className="px-4 py-3">{renderScheduleBadge(student)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenAssign({
                            id: student.userId,
                            name: student.name,
                          });
                        }}
                      >
                        Gán học phí
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssignStudentTuitionModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setSelectedStudent(null);
        }}
        onSuccess={() => void refetch()}
        student={selectedStudent}
        programId={programIdForClass}
        programName={classInfo?.program?.name}
      />

      <StudentTuitionDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        studentId={detailStudent?.id ?? null}
        studentName={detailStudent?.name ?? ""}
      />
    </div>
  );
}

const STATUS_MAP: Record<
  string,
  { label: string; className: string; priority: number }
> = {
  OVERDUE: {
    label: "Quá hạn",
    className: "bg-rose-100 text-rose-700",
    priority: 3,
  },
  PARTIAL: {
    label: "Đang đóng",
    className: "bg-amber-100 text-amber-700",
    priority: 2,
  },
  PENDING: {
    label: "Chưa đóng",
    className: "bg-blue-50 text-blue-700",
    priority: 1,
  },
};

function renderScheduleBadge(student: {
  schedules: any[];
}): JSX.Element | string {
  if (!student.schedules || student.schedules.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const pending = student.schedules.filter(
    (schedule) =>
      schedule.status !== "PAID" && schedule.status !== "CANCELLED"
  );

  if (pending.length === 0) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Hoàn tất
      </span>
    );
  }

  const current = pending.sort(
    (a, b) => Number(a.installmentNumber) - Number(b.installmentNumber)
  )[0];

  const map =
    STATUS_MAP[current.status] ?? STATUS_MAP.PENDING ?? {
      label: current.status,
      className: "bg-slate-100 text-slate-600",
      priority: 0,
    };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${map.className}`}
    >
      {map.label} • Kỳ {current.installmentNumber}
    </span>
  );
}

function SkeletonRow(): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
