import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { ApprovalStatus, StudentFormResponse } from "../../types/form";
import {
  useFormDetail,
  useStudentFormMutations,
} from "../../hooks/api/forms";

type StudentFormDetailDrawerProps = {
  formId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefetch?: () => void;
};

const approvalLabels: Record<ApprovalStatus, string> = {
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PENDING: "Chờ duyệt",
  PROCESSING: "Đang xử lý",
};

export function StudentFormDetailDrawer({
  formId,
  isOpen,
  onClose,
  onRefetch,
}: StudentFormDetailDrawerProps) {
  const { data, isLoading, error } = useFormDetail(formId, {
    enabled: isOpen,
  });
  const [note, setNote] = useState("");
  const { approveFormMutation, deleteFormMutation } = useStudentFormMutations();

  const handleDecision = (decision: ApprovalStatus) => {
    if (!formId) return;
    approveFormMutation.mutate(
      {
        formId,
        data: { decision, note: note.trim() || undefined },
      },
      {
        onSuccess: () => {
          onRefetch?.();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!formId) return;
    const confirmed = window.confirm("Bạn chắc chắn muốn xóa đơn này?");
    if (!confirmed) return;
    deleteFormMutation.mutate(formId, {
      onSuccess: () => {
        onRefetch?.();
        onClose();
      },
    });
  };

  const approvalRows = buildApprovalRows(data);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-200"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-150"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="h-full w-full max-w-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Chi tiết đơn
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="h-full overflow-y-auto px-6 py-4">
                  {isLoading && (
                    <p className="text-sm text-gray-500">Đang tải thông tin...</p>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {(error as Error).message}
                    </div>
                  )}

                  {!isLoading && data && (
                    <div className="space-y-6">
                      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Thông tin học viên
                        </h3>
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <InfoRow label="Học viên" value={data.studentName} />
                          <InfoRow label="Email" value={data.email} />
                          <InfoRow label="SĐT" value={data.phoneNumber} />
                          <InfoRow label="Lớp" value={data.className} />
                          <InfoRow label="Chương trình" value={data.programName} />
                          <InfoRow label="Ngày tạo" value={data.createdAt} isDate />
                        </div>
                      </section>

                      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Thông tin đơn
                        </h3>
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <InfoRow label="Loại đơn" value={data.templateName} />
                          <InfoRow label="Mã đơn" value={`#${data.id}`} />
                          <InfoRow label="Trạng thái" value={approvalLabels[data.status ?? "PENDING"]} />
                          <InfoRow label="Lý do" value={data.reason || "—"} />
                          <InfoRow label="Từ ngày" value={data.startDate} isDate />
                          <InfoRow label="Đến ngày" value={data.endDate} isDate />
                        </div>
                      </section>

                      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Phê duyệt
                        </h3>
                        <div className="mt-3 space-y-3 text-sm text-gray-600">
                          {approvalRows.map((row) => (
                            <div
                              key={row.label}
                              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                            >
                              <p className="text-xs font-semibold text-gray-500">
                                {row.label}
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {row.status}
                              </p>
                              {row.note && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Ghi chú: {row.note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-3">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Ghi chú khi duyệt / từ chối"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecision("APPROVED")}
                            disabled={approveFormMutation.isPending}
                            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {approveFormMutation.isPending ? "Đang xử lý..." : "Duyệt đơn"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision("REJECTED")}
                            disabled={approveFormMutation.isPending}
                            className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteFormMutation.isPending}
                            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Xóa đơn
                          </button>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

const InfoRow = ({
  label,
  value,
  isDate,
}: {
  label: string;
  value?: string | number | null;
  isDate?: boolean;
}) => {
  let display = value ?? "—";
  if (isDate && value) {
    try {
      display = new Intl.DateTimeFormat("vi-VN").format(new Date(String(value)));
    } catch {
      display = value;
    }
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{display}</span>
    </div>
  );
};

const buildApprovalRows = (form?: StudentFormResponse | null) => {
  if (!form) return [];
  return [
    {
      label: "Giáo viên",
      status: approvalLabels[form.coachApproval ?? "PENDING"],
      note: form.coachNote,
    },
    {
      label: "Giáo vụ",
      status: approvalLabels[form.academicApproval ?? "PENDING"],
      note: form.academicNote,
    },
    {
      label: "Kế toán",
      status: approvalLabels[form.accountantApproval ?? "PENDING"],
      note: form.accountantNote,
    },
    {
      label: "Admin",
      status: approvalLabels[form.adminApproval ?? "PENDING"],
      note: form.adminNote,
    },
  ];
};
