import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import TuitionAdminService, { type StudentPaymentScheduleDTO, type StudentPaymentScheduleHistoryDTO } from '../../services/tuitionAdminService';
import type { TuitionOverview } from '../../types/tuition';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';
import PaymentModal from './PaymentModal';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import StudentTuitionAdjustFeeModal from './StudentTuitionAdjustFeeModal';

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: number | null;
  studentName?: string;
}

export default function StudentTuitionDetailModal({ open, onClose, studentId, studentName }: Props) {
  const [data, setData] = useState<TuitionOverview | null>(null);
  const [schedules, setSchedules] = useState<StudentPaymentScheduleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noTuition, setNoTuition] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedStudentTuitionId, setSelectedStudentTuitionId] = useState<number | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<StudentPaymentScheduleHistoryDTO[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySchedule, setHistorySchedule] = useState<StudentPaymentScheduleDTO | null>(null);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const nestedModalOpen = paymentModalOpen || adjustOpen || historyModalOpen;

  const { notification, hideNotification, showApiError } = useNotification();

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);

      try {
        const overview = await TuitionAdminService.getStudentOverview(studentId);
        setData(overview);
        setNoTuition(false);
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;
        if (status === 404) {
          setNoTuition(true);
          setData(null);
        } else {
          const msg = showApiError(e, 'Không thể tải dữ liệu học viên', 'Lỗi tải dữ liệu học viên');
          setError(msg ?? 'Không thể tải dữ liệu học viên');
        }
      }

      try {
        const scheds = await TuitionAdminService.getStudentSchedules(studentId);
        setSchedules(scheds);
      } catch (err: any) {
        const msg = showApiError(err, 'Không thể tải lịch đóng học phí', 'Lỗi tải lịch đóng học phí');
        setError(msg ?? 'Không thể tải lịch đóng học phí');
        setSchedules([]);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, showApiError]);

  useEffect(() => {
    if (open && studentId) {
      fetchData();
    } else if (!open) {
      setData(null);
      setSchedules([]);
      setError(null);
      setNoTuition(false);
    }
  }, [open, studentId, fetchData]);

  const payableSchedules = useMemo(() => {
    return (schedules || []).filter((s) => s.status !== 'PAID' && s.status !== 'CANCELLED');
  }, [schedules]);

  const adjustableSchedules = useMemo(() => {
    return payableSchedules.filter(
      (s) => s.status !== 'OVERDUE'
    );
  }, [payableSchedules]);

  useEffect(() => {
    if (!nestedModalOpen) {
      detailPanelRef.current?.removeAttribute('inert');
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (active && detailPanelRef.current?.contains(active)) {
      active.blur();
    }
    detailPanelRef.current?.setAttribute('inert', '');
  }, [nestedModalOpen]);

  function mapScheduleToInfo(sch: StudentPaymentScheduleDTO, sid: number, currentBalance?: number | null) {
    const paid = sch.paidAmount ?? 0;
    const remaining = Math.max(0, sch.expectedAmount - paid);
    return {
      id: sch.id,
      studentId: sid,
      installmentNumber: sch.installmentNumber,
      expectedAmount: sch.expectedAmount,
      paidAmount: paid,
      remainingAmount: remaining,
      totalOutstanding: typeof currentBalance === 'number' ? currentBalance : Math.max(remaining, sch.expectedAmount),
      dueDate: sch.dueDate ?? undefined,
    };
  }

  const scheduleOptionsForPayment = useMemo(() => {
    if (!studentId) return [] as ReturnType<typeof mapScheduleToInfo>[];
    return payableSchedules.map((sch) => mapScheduleToInfo(sch, studentId, data?.currentBalance));
  }, [payableSchedules, studentId, data?.currentBalance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-blue-50 text-blue-700';
      default: return 'bg-blue-50 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Đã thanh toán';
      case 'PARTIAL': return 'Thanh toán 1 phần';
      case 'OVERDUE': return 'Quá hạn';
      case 'CANCELLED': return 'Đã hủy';
      case 'PENDING': return 'Chờ thanh toán';
      default: return status;
    }
  };

  const handleOpenHistory = async (schedule: StudentPaymentScheduleDTO) => {
    if (!schedule?.id) return;
    setHistorySchedule(schedule);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryModalOpen(true);
    try {
      const entries = await TuitionAdminService.getScheduleHistory(schedule.id);
      setHistoryEntries(entries || []);
    } catch (err: any) {
      const msg = showApiError(err, 'Không thể tải lịch sử chỉnh sửa hạn đóng', 'Lỗi tải lịch sử hạn đóng');
      setHistoryError(msg ?? 'Không thể tải lịch sử chỉnh sửa hạn đóng.');
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                <DialogPanel
                  ref={detailPanelRef}
                  className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl"
                >
                  <div className="flex flex-col gap-4 border-b border-teal-100 bg-gradient-to-r from-teal-50/90 to-white px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <DialogTitle as="h3" className="text-xl font-semibold text-slate-900">
                        Chi tiết học phí {studentName ? `· ${studentName}` : ""}
                      </DialogTitle>
                      {studentId && (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Mã học viên</span>
                          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 shadow-sm ring-1 ring-teal-100">
                            #{studentId}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {!noTuition && schedules.length > 0 && (
                        <button
                          onClick={() => {
                            const id =
                              schedules.find((s) => typeof s.studentTuitionId === "number")?.studentTuitionId ||
                              null;
                            setSelectedStudentTuitionId(id ?? null);
                            if (id) setAdjustOpen(true);
                          }}
                          className="inline-flex items-center rounded-lg border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                        >
                          Chỉnh sửa học phí
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                      >
                        <span className="sr-only">Đóng</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="px-6 py-6 space-y-6">
                    {loading && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow animate-pulse">
                        Đang tải dữ liệu học viên...
                      </div>
                    )}

                    {!loading && error && !noTuition && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                      </div>
                    )}

                    {!loading && noTuition && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Học viên hiện chưa được gán học phí. Vui lòng gán học phí từ trang lớp học.
                      </div>
                    )}

                    {!loading && data && (
                      <>
                        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                          <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                            <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Chi tiết cấu thành học phí
                          </h3>
                          <div className="grid gap-6 text-sm md:grid-cols-3">
                            <div>
                              <span className="block text-slate-500">Giá niêm yết (gốc)</span>
                              <span className="text-xl font-semibold text-slate-900">
                                <CurrencyDisplay amount={data.totalPaid + data.currentBalance + (data.totalWaived || 0)} />
                              </span>
                            </div>
                            <div>
                              <span className="block text-slate-500">Giảm giá / Học bổng</span>
                              <span className="text-xl font-semibold text-emerald-700">
                                - <CurrencyDisplay amount={data.totalWaived || 0} />
                              </span>
                            </div>
                            <div>
                              <span className="block text-slate-500">Tổng phải đóng (sau giảm)</span>
                              <span className="text-xl font-bold text-teal-700">
                                <CurrencyDisplay amount={data.totalPaid + data.currentBalance} />
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng học phí</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              <CurrencyDisplay amount={data.totalPaid + data.currentBalance} />
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đã thu</p>
                            <p className="mt-2 text-2xl font-bold text-emerald-700">
                              <CurrencyDisplay amount={data.totalPaid} />
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Còn nợ</p>
                            <p className="mt-2 text-2xl font-bold text-rose-700">
                              <CurrencyDisplay amount={data.currentBalance} />
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">Lịch trình đóng học phí</h3>
                            {adjustableSchedules.length > 0 && (
                              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                {adjustableSchedules.length} đợt chưa hoàn tất
                              </span>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Đợt</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hạn đóng</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Số tiền</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Đã đóng</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Hành động</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm">
                                {schedules.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                                      Chưa có lịch đóng tiền nào.
                                    </td>
                                  </tr>
                                ) : (
                                  schedules.map((sch) => (
                                    <tr key={sch.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-slate-900">Đợt {sch.installmentNumber}</td>
                                      <td className="px-6 py-4 text-slate-600">{sch.dueDate || "---"}</td>
                                      <td className="px-6 py-4 font-semibold text-slate-900">
                                        <CurrencyDisplay amount={sch.expectedAmount} />
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">
                                        <CurrencyDisplay amount={sch.paidAmount || 0} />
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(sch.status)}`}>
                                          {getStatusLabel(sch.status)}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3 text-xs">
                                          <button
                                            onClick={() => handleOpenHistory(sch)}
                                            className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900"
                                          >
                                            Lịch sử sửa hạn
                                          </button>
                                          {sch.status !== "PAID" && sch.status !== "CANCELLED" && (
                                            <span className="text-slate-400">Thanh toán qua nút trên</span>
                                          )}
                                          {sch.status === "PAID" && (
                                            <span className="inline-flex items-center gap-1 text-emerald-600">
                                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path
                                                  fillRule="evenodd"
                                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                              Hoàn thành
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {!loading && !noTuition && payableSchedules.length > 0 && studentId && (
                      <div className="mt-6 border-t border-slate-100 pt-4 flex justify-start">
                        <button
                          onClick={() => setPaymentModalOpen(true)}
                          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                        >
                          Thanh toán
                        </button>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        schedule={scheduleOptionsForPayment[0] ?? null}
        availableSchedules={scheduleOptionsForPayment}
        onSuccess={() => fetchData()}
      />

      <StudentTuitionAdjustFeeModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        studentTuitionId={selectedStudentTuitionId}
        pendingSchedules={adjustableSchedules}
        onSuccess={() => fetchData()}
      />

      <HistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        schedule={historySchedule}
        loading={historyLoading}
        error={historyError}
        entries={historyEntries}
      />

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </>
  );
}

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  schedule: StudentPaymentScheduleDTO | null;
  loading: boolean;
  error: string | null;
  entries: StudentPaymentScheduleHistoryDTO[];
}

function HistoryModal({ open, onClose, schedule, loading, error, entries }: HistoryModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900">
                      Lịch sử chỉnh sửa hạn đóng
                    </DialogTitle>
                    {schedule && (
                      <p className="text-xs text-gray-500 mt-1">
                        Đợt {schedule.installmentNumber} · Hạn hiện tại: {schedule.dueDate || '---'}
                      </p>
                    )}
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {loading && <div className="text-sm text-gray-500">Đang tải lịch sử...</div>}

                  {!loading && error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                  )}

                  {!loading && !error && entries.length === 0 && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      Chưa có ghi nhận lịch sử chỉnh sửa cho đợt học phí này.
                    </div>
                  )}

                  {!loading && !error && entries.length > 0 && (
                    <ul className="space-y-3">
                      {entries.map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {new Date(entry.createdAt).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.modifiedByUsername ? `Bởi ${entry.modifiedByUsername}` : 'Hệ thống'}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-3">
                            <div>
                              <span className="font-medium text-gray-700">Hạn cũ:</span>{' '}
                              {entry.oldDueDate ?? '---'}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Hạn mới:</span>{' '}
                              {entry.newDueDate}
                            </div>
                            {entry.reason && (
                              <div className="md:col-span-3">
                                <span className="font-medium text-gray-700">Lý do:</span>{' '}
                                <span className="text-gray-800">{entry.reason}</span>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
