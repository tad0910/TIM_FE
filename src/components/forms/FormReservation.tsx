import { useState, useEffect } from "react";
import type { User } from "../../services/userApi";
import { fetchStudentEnrollment, type StudentEnrollmentInfo } from "../../utils/studentEnrollment";
import type { ClassInfo } from "../../types/class";
import type { Program } from "../../types/program";
import { getAllClassesAsArray } from "../../services/classApi";
import { programApi } from "../../services/programApi";

interface FormReservationProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  student: User;
  enrollment?: StudentEnrollmentInfo | null;
}

export default function FormReservation({
  onSubmit,
  onCancel,
  student,
  enrollment,
}: FormReservationProps) {
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    studentId: "",
    fullName: "",
    phoneNumber: "",
    email: "",
    classId: "",
    className: "",
    programId: "",
    programName: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    if (student) {
      setFormData((prev) => ({
        ...prev,
        studentId: student.id.toString(),
        fullName:
          `${student.lastName || ""} ${student.firstName || ""}`.trim() ||
          student.username,
        phoneNumber: student.phoneNumber || "",
        email: student.email || "",
      }));
    }
  }, [student]);

  useEffect(() => {
    if (enrollment) {
      setFormData((prev) => ({
        ...prev,
        classId: String(enrollment.classId),
        className: enrollment.className || "",
        programId: enrollment.programId ? String(enrollment.programId) : "",
        programName: enrollment.programName || "",
      }));
      setEnrollmentLoading(false);
      setEnrollmentError(null);
      return;
    }

    let cancelled = false;
    const loadEnrollment = async () => {
      if (!student?.id) {
        setEnrollmentError("Vui lòng chọn học viên hợp lệ.");
        setFormData((prev) => ({
          ...prev,
          classId: "",
          className: "",
          programId: "",
          programName: "",
        }));
        return;
      }

      setEnrollmentLoading(true);
      setEnrollmentError(null);
      try {
        const info = await fetchStudentEnrollment(student.id);
        if (cancelled) return;

        if (!info) {
          setEnrollmentError(
            "Học viên chưa thuộc lớp/chương trình nào nên không thể tạo đơn."
          );
          setFormData((prev) => ({
            ...prev,
            classId: "",
            className: "",
            programId: "",
            programName: "",
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          classId: String(info.classId),
          className: info.className || "",
          programId: info.programId ? String(info.programId) : "",
          programName: info.programName || "",
        }));
      } catch (error) {
        console.error("Failed to resolve student enrollment", error);
        if (!cancelled) {
          setEnrollmentError("Không thể xác định lớp/chương trình của học viên.");
        }
      } finally {
        if (!cancelled) {
          setEnrollmentLoading(false);
        }
      }
    };

    void loadEnrollment();
    return () => {
      cancelled = true;
    };
  }, [student, enrollment]);

  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const data = await getAllClassesAsArray();
        if (!cancelled) {
          setClasses(data);
        }
      } catch (error) {
        console.error("Failed to load classes list", error);
      } finally {
        if (!cancelled) {
          setLoadingClasses(false);
        }
      }
    };

    const loadPrograms = async () => {
      try {
        setLoadingPrograms(true);
        const data = await programApi.getAllProgramsAsArray();
        if (!cancelled) {
          setPrograms(data);
        }
      } catch (error) {
        console.error("Failed to load programs list", error);
      } finally {
        if (!cancelled) {
          setLoadingPrograms(false);
        }
      }
    };

    void loadClasses();
    void loadPrograms();

    return () => {
      cancelled = true;
    };
  }, [student?.id]);

  const handleSelectClass = (classId: string) => {
    if (!classId) {
      setFormData((prev) => ({
        ...prev,
        classId: "",
        className: "",
        programId: "",
        programName: "",
      }));
      return;
    }

    const selected = classes.find((cls) => String(cls.id) === classId);
    const derivedProgramId =
      selected?.program?.id ?? selected?.programId ?? null;
    const derivedProgramName =
      selected?.program?.name ??
      programs.find((program) => program.id === derivedProgramId)?.name ??
      "";

    setFormData((prev) => ({
      ...prev,
      classId,
      className: selected?.className || prev.className,
      programId: derivedProgramId ? String(derivedProgramId) : prev.programId,
      programName: derivedProgramName || prev.programName,
    }));
  };

  const handleSelectProgram = (programId: string) => {
    if (!programId) {
      setFormData((prev) => ({ ...prev, programId: "", programName: "" }));
      return;
    }
    const selected = programs.find(
      (program) => String(program.id) === programId
    );
    setFormData((prev) => ({
      ...prev,
      programId,
      programName: selected?.name || prev.programName,
    }));
  };

  useEffect(() => {
    if (!formData.programId || formData.programName) return;
    const matched = programs.find(
      (program) => String(program.id) === formData.programId
    );
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        programName: matched.name,
      }));
    }
  }, [programs, formData.programId, formData.programName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) {
      alert("Không thể tạo đơn vì học viên chưa thuộc lớp/chương trình nào.");
      return;
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        alert("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[35px] font-bold uppercase tracking-[0.25em] text-teal-700">
          ĐƠN BẢO LƯU
        </p>
        <p className="mt-2 text-sm italic text-rose-500">
          (Đơn sẽ được các bộ phận xem xét và thông báo đến học viên trong thời
          gian sớm nhất.)
        </p>
      </div>

      <section>
        <p className="text-lg font-semibold text-rose-500 mb-3">
          Phần dành cho học viên
        </p>
        <div className="space-y-4 border-t border-slate-300 pt-4">
          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Mã học viên
            </label>
            <input
              type="text"
              value={formData.studentId}
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Họ tên
            </label>
            <input
              type="text"
              value={formData.fullName}
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Số điện thoại
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Trạng thái
            </label>
            <input
              type="text"
              value="Đang học"
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Lớp học
            </label>
            <select
              value={formData.classId}
              onChange={(e) => handleSelectClass(e.target.value)}
              disabled={loadingClasses}
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {loadingClasses ? (
                <option value="">Đang tải lớp học...</option>
              ) : (
                <>
                  {!!formData.classId &&
                    !classes.some((cls) => String(cls.id) === formData.classId) && (
                      <option value={formData.classId}>
                        {formData.className || `Lớp ${formData.classId}`}
                      </option>
                    )}
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Chương trình học
            </label>
            <input
              type="text"
              value={
                enrollmentLoading
                  ? "Đang xác định..."
                  : formData.programName || "Chưa có chương trình"
              }
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          {enrollmentError && (
            <p className="text-sm text-red-500">
              {enrollmentError}
            </p>
          )}

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Thời hạn bảo lưu
            </label>
            <div className="flex-1 flex gap-2">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
              <span className="px-2 py-2">-</span>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Lý do bảo lưu
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={6}
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={
            !formData.classId || !!enrollmentError || isSubmitting
          }
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Đang tạo...
            </>
          ) : (
            "Tạo đơn"
          )}
        </button>
      </div>
    </form>
  );
}
