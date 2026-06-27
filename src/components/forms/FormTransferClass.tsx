import { useState, useEffect } from "react";
import type { User } from "../../services/userApi";
import { fetchStudentEnrollment, type StudentEnrollmentInfo } from "../../utils/studentEnrollment";

interface FormTransferClassProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  student: User;
  enrollment?: StudentEnrollmentInfo | null;
}

const STUDENT_STATUSES = ["Đang học", "Đình chỉ", "Thôi học", "Bảo lưu"];

export default function FormTransferClass({
  onSubmit,
  onCancel,
  student,
  enrollment,
}: FormTransferClassProps) {
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    studentId: "",
    fullName: "",
    phoneNumber: "",
    email: "",
    status: "",
    className: "",
    programName: "",
    reason: "",
    classId: "",
    programId: "",
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
        programId: enrollment.programId ? String(enrollment.programId) : "",
        className: enrollment.className || "",
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
          programId: "",
          className: "",
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
            programId: "",
            className: "",
            programName: "",
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          classId: String(info.classId),
          programId: info.programId ? String(info.programId) : "",
          className: info.className || "",
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

  const handleStatusSelect = (status: string) => {
    setFormData((prev) => ({ ...prev, status }));
    setShowStatusDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) {
      alert("Không thể tạo đơn vì học viên chưa thuộc lớp/chương trình nào.");
      return;
    }
    if (!formData.status) {
      alert("Vui lòng chọn trạng thái.");
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        programId: formData.programId ? Number(formData.programId) : undefined,
        classId: Number(formData.classId),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[35px] font-bold uppercase tracking-[0.25em] text-teal-700">
          ĐƠN CHUYỂN LỚP
        </p>
        <p className="mt-2 text-sm italic text-rose-500">
          (Đơn chuyển lớp sẽ được các trưởng bộ phận xem xét và thông báo đến
          học viên trong thời gian sớm nhất.)
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
            <div className="flex-1 relative dropdown-container">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full text-left border border-gray-300 rounded px-3 py-2 bg-white"
              >
                {formData.status || "Chọn trạng thái"}
              </button>
              {showStatusDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                  {STUDENT_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusSelect(status)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Lớp học hiện tại
            </label>
            <input
              type="text"
              value={
                enrollmentLoading
                  ? "Đang xác định..."
                  : formData.className || "Chưa có lớp"
              }
              readOnly
              className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Chương trình hiện tại
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
            <p className="text-sm text-red-500">{enrollmentError}</p>
          )}

          <div className="flex gap-5">
            <label className="w-52 shrink-0 font-semibold text-teal-700">
              Lý do
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
            !formData.classId || !!enrollmentError || !formData.status || isLoading
          }
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
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
