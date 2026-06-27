import { 
  Fragment, 
  useCallback, 
  useMemo, 
  useState 
} from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { BriefcaseIcon } from "@heroicons/react/24/outline";

import LoadingSpinner from "../../../components/tuition/LoadingSpinner";
import useAdminJobTracking from "../../../hooks/useAdminJobTracking";
import adminJobLeadAdminApi from "../../../services/adminJobLeadAdminApi";
import { updateClassJobsSettings } from "../../../services/classApi";
import type { ClassInfo } from "../../../types/class";
import type { AdminJobTrackingRow, JobLeadStatusCode } from "../../../types/job";

const JOB_STATUS_LABELS: Record<JobLeadStatusCode, string> = {
  NEW: "Mới",
  APPLIED: "Đã ứng tuyển",
  INTERVIEWING: "Đang phỏng vấn",
  OFFER: "Đã nhận offer",
  PROBATION: "Thử việc",
  OFFICIAL: "Chính thức",
  FAILED: "Không đạt",
  IGNORED: "Bỏ qua",
};

const STATUS_BADGE_CLASSES: Partial<Record<JobLeadStatusCode, string>> = {
  NEW: "bg-gray-100 text-gray-700",
  APPLIED: "bg-sky-100 text-sky-700",
  INTERVIEWING: "bg-indigo-100 text-indigo-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  PROBATION: "bg-amber-100 text-amber-700",
  OFFICIAL: "bg-blue-100 text-blue-700",
  FAILED: "bg-rose-100 text-rose-700",
  IGNORED: "bg-slate-100 text-slate-600",
};

type ClassJobsSectionProps = {
  classInfo: ClassInfo | null | undefined;
  numericClassId: number | null;
  refetchClass: () => Promise<void>;
  showSuccess: (title: string, message: string) => void;
  showApiError: (error: unknown, message: string, title?: string) => void;
};

export default function ClassJobsSection({
  classInfo,
  numericClassId,
  refetchClass,
  showSuccess,
  showApiError,
}: ClassJobsSectionProps) {
  const classId = numericClassId ?? null;
  const classJobsEnabled = Boolean(classInfo?.jobsEnabled);
  const [classJobsUpdating, setClassJobsUpdating] = useState(false);
  const [jobReferralModalOpen, setJobReferralModalOpen] = useState(false);

  const jobTrackingClassId = classJobsEnabled && classId ? classId : null;
  const {
    rows: jobTrackingRows,
    loading: jobTrackingLoading,
    error: jobTrackingError,
    refresh: refreshJobTracking,
    toggleJobInterest,
    updating: jobTrackingUpdating,
  } = useAdminJobTracking(jobTrackingClassId, {
    enabled: Boolean(jobTrackingClassId),
    refetchIntervalMs: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const jobReferralStudents = useMemo(
    () =>
      jobTrackingRows.map((row: AdminJobTrackingRow) => ({
        id: row.studentId,
        name: row.studentName || row.username || `HV ${row.studentId}`,
      })),
    [jobTrackingRows]
  );

  const jobSummary = useMemo(() => {
    const total = jobTrackingRows.length;
    const offerCount = jobTrackingRows.filter((row: AdminJobTrackingRow) =>
      row.jobStatusCode?.toLowerCase().includes("offer")
    ).length;
    const activeSearch = jobTrackingRows.filter(
      (row: AdminJobTrackingRow) => row.jobInterest
    ).length;
    return { total, offerCount, activeSearch };
  }, [jobTrackingRows]);

  const handleToggleClassJobsEnabled = useCallback(async () => {
    if (!classId) return;
    const next = !classJobsEnabled;

    setClassJobsUpdating(true);
    try {
      await updateClassJobsSettings(classId, next);
      await refetchClass();
      showSuccess(
        next ? "Đã bật việc làm cho lớp" : "Đã tắt việc làm cho lớp",
        next
          ? "Tính năng theo dõi việc làm đã được bật cho lớp này."
          : "Tính năng theo dõi việc làm đã được tắt cho lớp này."
      );
    } catch (error: any) {
      showApiError(error, "Không thể cập nhật trạng thái việc làm của lớp");
    } finally {
      setClassJobsUpdating(false);
    }
  }, [classId, classJobsEnabled, refetchClass, showApiError, showSuccess]);

  const handleOpenJobReferral = useCallback(() => {
    if (!classId) return;
    setJobReferralModalOpen(true);
  }, [classId]);

  const handleJobInterestToggle = useCallback(
    async (studentId: number, next: boolean) => {
      try {
        await toggleJobInterest(studentId, next);
        showSuccess(
          next ? "Đã bật nhu cầu tìm việc" : "Đã tắt nhu cầu tìm việc",
          next
            ? "Học viên sẽ được ưu tiên giới thiệu cơ hội việc làm."
            : "Đã ghi nhận học viên không còn cần hỗ trợ tìm việc."
        );
      } catch (error) {
        showApiError(
          error,
          "Không thể cập nhật nhu cầu tìm việc. Vui lòng thử lại.",
          "Cập nhật thất bại"
        );
      }
    },
    [showApiError, showSuccess, toggleJobInterest]
  );

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-teal-100 bg-white shadow-sm">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                Theo dõi việc làm
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                Trạng thái đầu mối của lớp
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-2xl">
                Theo dõi tiến độ tìm việc của từng học viên, kiểm tra offer
                mới và bật/tắt nhu cầu hỗ trợ tìm việc.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">
                  Tổng đầu mối:{" "}
                  <strong className="ml-1">{jobSummary.total}</strong>
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  Đã nhận offer:{" "}
                  <strong className="ml-1">{jobSummary.offerCount}</strong>
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                  Đang cần giới thiệu:{" "}
                  <strong className="ml-1">{jobSummary.activeSearch}</strong>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleToggleClassJobsEnabled()}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
                  classJobsEnabled
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
                type="button"
                disabled={classJobsUpdating}
              >
                {classJobsUpdating
                  ? "Đang cập nhật..."
                  : classJobsEnabled
                    ? "Việc làm: ON"
                    : "Việc làm: OFF"}
              </button>
              <button
                onClick={handleOpenJobReferral}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
                type="button"
                disabled={!classJobsEnabled || !classId}
              >
                <BriefcaseIcon className="h-5 w-5" />
                Giới thiệu cho doanh nghiệp
              </button>
              <button
                onClick={refreshJobTracking}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                type="button"
                disabled={!classJobsEnabled}
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
          <h3 className="px-6 py-4 text-base font-semibold text-gray-900 border-b border-gray-100">
            Trạng thái việc làm
          </h3>
          <div className="p-6">
            {!classJobsEnabled ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                Lớp học đang tắt tính năng việc làm. Bật "Việc làm lớp: ON" để
                bắt đầu theo dõi.
              </div>
            ) : null}
            {jobTrackingError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {jobTrackingError}
              </div>
            )}
            {classJobsEnabled && jobTrackingLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : classJobsEnabled && jobTrackingRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Chưa có dữ liệu đầu mối việc làm cho lớp này.
              </div>
            ) : classJobsEnabled ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Học viên
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Trạng thái tìm việc
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Công ty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Mức offer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Mức lương thử việc
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Mức lương chính thức
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-teal-700">
                        Có nhu cầu tìm việc
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-sm">
                    {jobTrackingRows.map(
                      (row: AdminJobTrackingRow, index: number) => (
                        <tr key={row.studentId}>
                          <td className="px-4 py-3 text-gray-600">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.studentName ||
                              row.username ||
                              `HV ${row.studentId}`}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                STATUS_BADGE_CLASSES[
                                  row.jobStatusCode as JobLeadStatusCode
                                ] ?? "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                              {JOB_STATUS_LABELS[
                                row.jobStatusCode as JobLeadStatusCode
                              ] ??
                                row.jobStatusLabel ??
                                row.jobStatusCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.companyName || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.offerAmount || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.probationSalary || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.officialSalary || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className={`w-12 rounded-full border px-2 py-1 text-xs font-semibold transition ${
                                  row.jobInterest
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-gray-300 bg-gray-50 text-gray-400"
                                }`}
                                type="button"
                                onClick={() =>
                                  handleJobInterestToggle(row.studentId, true)
                                }
                                disabled={!classJobsEnabled || jobTrackingUpdating}
                              >
                                ON
                              </button>
                              <button
                                className={`w-12 rounded-full border px-2 py-1 text-xs font-semibold transition ${
                                  !row.jobInterest
                                    ? "border-red-300 bg-red-50 text-red-600"
                                    : "border-gray-200 bg-gray-50 text-gray-400"
                                }`}
                                type="button"
                                onClick={() =>
                                  handleJobInterestToggle(row.studentId, false)
                                }
                                disabled={!classJobsEnabled || jobTrackingUpdating}
                              >
                                OFF
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {jobReferralModalOpen && classId && (
        <JobReferralModal
          open={jobReferralModalOpen}
          onClose={() => setJobReferralModalOpen(false)}
          classId={classId}
          students={jobReferralStudents}
          showSuccess={showSuccess}
          showApiError={showApiError}
        />
      )}
    </>
  );
}

type JobReferralModalProps = {
  open: boolean;
  onClose: () => void;
  classId: number;
  students: Array<{ id: number; name: string }>;
  showSuccess: (title: string, message: string) => void;
  showApiError: (error: unknown, message: string, title?: string) => void;
};

function JobReferralModal({
  open,
  onClose,
  classId,
  students,
  showSuccess,
  showApiError,
}: JobReferralModalProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    shortName: "",
    address: "",
    website: "",
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleStudent = (studentId: number) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedIds.length === 0 || !formData.companyName.trim()) return;

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map((studentId) =>
          adminJobLeadAdminApi.create(classId, studentId, {
            companyName: formData.companyName,
            shortName: formData.shortName,
            address: formData.address,
            website: formData.website,
          })
        )
      );
      showSuccess(
        "Đã gửi giới thiệu",
        `${selectedIds.length} học viên đã được giới thiệu tới doanh nghiệp.`
      );
      onClose();
    } catch (error) {
      showApiError(
        error,
        "Không thể gửi giới thiệu việc làm. Vui lòng thử lại.",
        "Giới thiệu thất bại"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (!isSubmitting) onClose();
        }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div>
                    <DialogTitle as="h2" className="text-lg font-semibold text-gray-900">
                      Giới thiệu cho doanh nghiệp
                    </DialogTitle>
                    <p className="text-xs text-gray-500">
                      Điền thông tin doanh nghiệp và chọn học viên muốn gửi.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={isSubmitting}
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="grid gap-6 px-6 py-6 lg:grid-cols-2"
                >
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Công ty *
              <input
                value={formData.companyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="CMC Test"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Tên viết tắt
              <input
                value={formData.shortName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shortName: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="CMC"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Địa chỉ
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="mt-2 h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="Số 1 Nguyễn Trãi, Hà Nội"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Website
              <input
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="https://company.com"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Học viên</h3>
              <span className="text-xs text-gray-500">
                Chọn ít nhất một học viên
              </span>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-gray-200 p-3">
              {students.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Không có học viên nào để giới thiệu.
                </p>
              ) : (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student.id)}
                        onChange={() => handleToggleStudent(student.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-gray-900">
                        {student.name}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                disabled={
                  selectedIds.length === 0 ||
                  !formData.companyName.trim() ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
