import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import TuitionAdminService, { type StudentPaymentScheduleDTO } from '../../services/tuitionAdminService';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';

interface Props {
  open: boolean;
  onClose: () => void;
  studentTuitionId: number | null;
  pendingSchedules?: StudentPaymentScheduleDTO[];
  onSuccess?: () => void;
}

const normalizeDueDate = (value?: string | null) => {
  if (!value) return '';
  return value.length > 10 ? value.slice(0, 10) : value;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '---';
  return `${new Intl.NumberFormat('vi-VN').format(value)}₫`;
};

export default function StudentTuitionAdjustFeeModal({ open, onClose, studentTuitionId, pendingSchedules = [], onSuccess }: Props) {
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();

  const currentSchedule = useMemo(() => {
    if (!pendingSchedules.length) return null;
    const priority = (status?: string) => {
      const normalized = (status || '').toUpperCase();
      if (normalized === 'PARTIAL' || normalized === 'IN_PROGRESS') return 0;
      if (normalized === 'PENDING' || normalized === 'WAITING') return 1;
      if (normalized === 'OVERDUE') return 2;
      return 3;
    };
    const normalizeDate = (value?: string | null) => {
      if (!value) return Number.MAX_SAFE_INTEGER;
      const time = Date.parse(value);
      return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    };
    return [...pendingSchedules].sort((a, b) => {
      const diffPriority = priority(a.status) - priority(b.status);
      if (diffPriority !== 0) return diffPriority;

      const diffDate = normalizeDate(a.dueDate) - normalizeDate(b.dueDate);
      if (diffDate !== 0) return diffDate;

      const aInstallment = typeof a.installmentNumber === 'number' ? a.installmentNumber : Number.MAX_SAFE_INTEGER;
      const bInstallment = typeof b.installmentNumber === 'number' ? b.installmentNumber : Number.MAX_SAFE_INTEGER;
      if (aInstallment !== bInstallment) return aInstallment - bInstallment;

      return (a.id ?? 0) - (b.id ?? 0);
    })[0];
  }, [pendingSchedules]);
  const hasSchedules = !!currentSchedule;

  useEffect(() => {
    if (!open) {
      setNewDueDate('');
      setReason('');
      setSubmitting(false);
      return;
    }

    if (currentSchedule) {
      setNewDueDate(normalizeDueDate(currentSchedule.dueDate));
      setReason('');
    } else {
      setNewDueDate('');
    }
  }, [open, currentSchedule]);

  const handleSubmit = async () => {
    if (!studentTuitionId) {
      showWarning('Thiếu thông tin', 'Không xác định được học phí học viên.');
      return;
    }
    if (!currentSchedule?.id) {
      showWarning('Thiếu thông tin', 'Không có đợt học phí khả dụng để gia hạn.');
      return;
    }
    if (!newDueDate) {
      showWarning('Thiếu hạn đóng', 'Vui lòng chọn hạn đóng mới.');
      return;
    }

    try {
      setSubmitting(true);
      await TuitionAdminService.updateScheduleDueDate({
        scheduleId: currentSchedule.id,
        dueDate: newDueDate,
        reason: reason.trim() ? reason.trim() : undefined,
      });
      showSuccess('Đã cập nhật hạn đóng');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showApiError(error, 'Không thể cập nhật hạn đóng', 'Lỗi cập nhật hạn đóng');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = hasSchedules && !!newDueDate && !submitting;

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all">
                  <div className="bg-gradient-to-r from-teal-50 to-white px-6 py-4 border-b border-teal-100 flex justify-between items-center">
                    <DialogTitle as="h3" className="text-lg font-semibold text-slate-900">Gia hạn hạn đóng</DialogTitle>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="px-6 py-6 space-y-5">
                    {!hasSchedules ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Không có đợt học phí ở trạng thái PENDING để gia hạn hạn đóng.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="space-y-2 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Đợt hiện tại</span>
                            <span className="font-semibold text-teal-800">Đợt {currentSchedule?.installmentNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Hạn đóng hiện tại</span>
                            <span className="font-semibold text-slate-900">{normalizeDueDate(currentSchedule?.dueDate) || '---'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Số tiền</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(currentSchedule?.expectedAmount)}</span>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="newDueDate" className="block text-sm font-semibold text-slate-800 mb-1">Hạn đóng mới</label>
                          <input
                            id="newDueDate"
                            type="date"
                            value={newDueDate}
                            onChange={(event) => setNewDueDate(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none"
                          />
                          <p className="mt-2 text-xs text-slate-500">Vui lòng chọn ngày tuân thủ chính sách gia hạn của trung tâm.</p>
                        </div>

                        <div>
                          <label htmlFor="adjustReason" className="block text-sm font-semibold text-slate-800 mb-1">Lý do (tuỳ chọn)</label>
                          <textarea
                            id="adjustReason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                            placeholder="Ghi chú cho lần gia hạn"
                          />
                          <p className="mt-2 text-xs text-slate-500">Thông tin này sẽ giúp ghi lại lý do điều chỉnh hạn đóng.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="inline-flex justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-100">Huỷ</button>
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-semibold ${
                        !canSubmit ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      Lưu hạn mới
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </>
  );
}
