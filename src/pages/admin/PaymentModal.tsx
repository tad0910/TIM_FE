import { Fragment, useMemo, useState, useEffect } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import TuitionAdminService from '../../services/tuitionAdminService';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';
import { useNotification } from '../../hooks/useNotification';
import NotificationPopup from '../../components/NotificationPopup';

interface ScheduleInfo {
  id: number;
  studentId: number;
  installmentNumber: number;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalOutstanding: number;
  dueDate?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  schedule: ScheduleInfo | null;
  availableSchedules?: ScheduleInfo[];
  onSuccess?: () => void;
}

const defaultScheduleAmount = (item: ScheduleInfo | null) => {
  if (!item) return "";
  const defaultAmount = item.remainingAmount > 0 ? item.remainingAmount : item.expectedAmount;
  return defaultAmount > 0 ? defaultAmount.toString() : "";
};

export default function PaymentModal({ open, onClose, schedule, availableSchedules = [], onSuccess }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();

  useEffect(() => {
    if (!open) {
      setPaymentMethod('CASH');
      setNote('');
      setAmountInput('');
      return;
    }

    const defaultSchedule = schedule ?? availableSchedules[0] ?? null;
    setPaymentMethod('CASH');
    setNote('');

    setAmountInput(defaultScheduleAmount(defaultSchedule));
  }, [open, schedule, availableSchedules]);

  const effectiveSchedule = useMemo(() => {
    if (!open) return null;
    return schedule ?? availableSchedules[0] ?? null;
  }, [open, schedule, availableSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSchedule = effectiveSchedule;
    if (!activeSchedule) {
      showWarning('Thiếu thông tin đợt thanh toán', 'Vui lòng chọn một đợt học phí để thanh toán.');
      return;
    }

    const parsedAmount = Number(amountInput);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showWarning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    if (activeSchedule.totalOutstanding >= 0 && parsedAmount - activeSchedule.totalOutstanding > 1e-6) {
      showWarning('Số tiền vượt quá số nợ hiện tại', 'Vui lòng kiểm tra lại số tiền cần thu.');
      return;
    }

    setLoading(true);
    try {
      const response = await TuitionAdminService.payTuition({
        studentId: activeSchedule.studentId,
        scheduleId: activeSchedule.id,
        amount: parsedAmount,
        paymentMethod,
        note
      });
      showSuccess(
        'Thanh toán thành công',
        `Đã thu ${new Intl.NumberFormat('vi-VN').format(parsedAmount)}₫ cho học viên. Mã biên lai: ${response.receiptCode}`,
      );
      onSuccess?.();
      setTimeout(onClose, 1500);
    } catch (err: any) {
      showApiError(err, 'Không thể thực hiện thanh toán', 'Lỗi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  if (!effectiveSchedule) return null;

  const remainingPercent =
    effectiveSchedule.expectedAmount > 0
      ? Math.min(
          100,
          Math.round(
            ((effectiveSchedule.remainingAmount ?? 0) / effectiveSchedule.expectedAmount) * 100
          )
        )
      : 0;
  const outstandingLabel = new Intl.NumberFormat('vi-VN').format(effectiveSchedule.totalOutstanding);

  return (
    <>
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100 px-6 py-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <DialogTitle as="h3" className="text-lg font-semibold text-slate-900">
                      Thanh toán học phí
                    </DialogTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Thu học phí cho đợt {effectiveSchedule.installmentNumber}. Tổng nợ hiện tại: {outstandingLabel}₫
                    </p>
                  </div>
                  <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600">
                    <span className="sr-only">Đóng</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-6 space-y-6">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Đã đóng</p>
                          <p className="text-xl font-bold text-teal-900">
                            <CurrencyDisplay amount={effectiveSchedule.paidAmount} />
                          </p>
                          <p  className="text-xs text-teal-600">Trong đợt này</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cần thu kỳ này</p>
                          <p className="text-xl font-bold text-emerald-900">
                            <CurrencyDisplay amount={effectiveSchedule.expectedAmount} />
                          </p>
                          {effectiveSchedule.dueDate && (
                            <p className="text-xs text-emerald-600">Hạn đóng: {effectiveSchedule.dueDate}</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                Còn nợ đợt này
                              </p>
                              <p className="text-2xl font-bold text-rose-900">
                                <CurrencyDisplay amount={effectiveSchedule.remainingAmount} />
                              </p>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-rose-600">
                                <span>0₫</span>
                                <span>Cần thu</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-rose-100">
                                <div
                                  className="h-2 rounded-full bg-rose-500"
                                  style={{ width: `${Math.max(5, remainingPercent)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                            <span>Số tiền thanh toán</span>
                            <span className="text-xs text-slate-400">* Bắt buộc</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step="50000"
                              value={amountInput}
                              onChange={(e) => setAmountInput(e.target.value)}
                              className="w-full rounded-2xl border-slate-200 py-4 pl-5 pr-28 text-2xl font-semibold tracking-wide text-slate-900 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                              placeholder="Nhập số tiền thu"
                              required
                            />
                            <span className="absolute inset-y-0 right-6 flex items-center text-base font-semibold text-slate-400">
                              VND
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Tối đa {new Intl.NumberFormat('vi-VN').format(effectiveSchedule.totalOutstanding)}₫ (tổng nợ hiện tại)
                          </p>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-slate-800">Phương thức thanh toán</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'CASH', label: 'Tiền mặt' },
                              { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
                              { value: 'POS', label: 'POS' },
                            ].map((method) => (
                              <button
                                key={method.value}
                                type="button"
                                onClick={() => setPaymentMethod(method.value)}
                                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
                                  paymentMethod === method.value
                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 text-slate-600 hover:border-teal-200'
                                }`}
                              >
                                {method.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-800">Ghi chú giao dịch (tùy chọn)</label>
                        <textarea
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Ví dụ: Thu tại quầy, chuyển khoản Vietcombank..."
                          className="w-full rounded-2xl border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">
                          <p>Đợt {effectiveSchedule.installmentNumber} · Học viên #{effectiveSchedule.studentId}</p>
                          <p>Còn nợ tổng: {new Intl.NumberFormat('vi-VN').format(effectiveSchedule.totalOutstanding)}₫</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                              type="button"
                              onClick={onClose}
                              className="inline-flex justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                          >
                              Hủy
                          </button>
                          <button
                              type="submit"
                              disabled={loading}
                              className="inline-flex justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-70"
                          >
                              {loading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
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
    <NotificationPopup notification={notification} onClose={hideNotification} />
    </>
  );
}
