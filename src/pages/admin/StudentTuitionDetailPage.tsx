import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import TuitionAdminService, { type StudentPaymentScheduleDTO, type StudentPaymentScheduleHistoryDTO } from '../../services/tuitionAdminService';
import type { TuitionOverview } from '../../types/tuition';
import PaymentModal from './PaymentModal';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';

export default function StudentTuitionDetailPage() {
  const { studentId } = useParams();
  const studentIdNumber = Number(studentId) || 0;
  const [data, setData] = useState<TuitionOverview | null>(null);
  const [schedules, setSchedules] = useState<StudentPaymentScheduleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noTuition, setNoTuition] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<StudentPaymentScheduleHistoryDTO[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySchedule, setHistorySchedule] = useState<StudentPaymentScheduleDTO | null>(null);

  const fetchData = useCallback(async () => {
    const id = Number(studentId);
    if (!id) {
      setError('Thiếu studentId trên URL');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      try {
        const overview = await TuitionAdminService.getStudentOverview(id);
        setData(overview);
        setNoTuition(false);
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;
        if (status === 404) {
          setNoTuition(true);
          setData(null);
        } else {
          setError(e?.message || 'Không thể tải dữ liệu học viên');
        }
      }

      try {
        const scheds = await TuitionAdminService.getStudentSchedules(id);
        setSchedules(scheds);
      } catch (e: any) {
        setSchedules([]);
        setError((prev) => prev ?? 'Không thể tải lịch đóng học phí');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [studentId, fetchData]);

  const payableSchedules = useMemo(() => {
    return (schedules || []).filter((sch) => sch.status !== 'PAID' && sch.status !== 'CANCELLED');
  }, [schedules]);

  function mapScheduleToInfo(sch: StudentPaymentScheduleDTO) {
    const paid = sch.paidAmount ?? 0;
    const remaining = Math.max(0, sch.expectedAmount - paid);
    return {
      id: sch.id,
      studentId: studentIdNumber,
      installmentNumber: sch.installmentNumber,
      expectedAmount: sch.expectedAmount,
      paidAmount: paid,
      remainingAmount: remaining,
      totalOutstanding: data?.currentBalance ?? Math.max(remaining, sch.expectedAmount),
      dueDate: sch.dueDate,
    };
  }

  const scheduleOptionsForPayment = useMemo(() => {
    if (!studentIdNumber) return [] as ReturnType<typeof mapScheduleToInfo>[];
    return payableSchedules.map(mapScheduleToInfo);
  }, [payableSchedules, studentIdNumber, data?.currentBalance]);

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
      setHistoryError(err?.message || 'Không thể tải lịch sử chỉnh sửa hạn đóng.');
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(v);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'PAID': return 'bg-green-100 text-green-800';
          case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
          case 'OVERDUE': return 'bg-red-100 text-red-800';
          case 'CANCELLED': return 'bg-gray-100 text-gray-800';
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

  if (loading && !data && !noTuition) return <div className="bg-white rounded-lg p-6 shadow animate-pulse">Đang tải dữ liệu học viên...</div>;
  if (error && !noTuition && schedules.length === 0) return <div className="bg-white rounded-lg p-6 shadow text-red-600">{error}</div>;

  if (noTuition) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Học phí - Học viên #{studentId}</h1>
          <button onClick={fetchData} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Làm mới dữ liệu</button>
        </div>
        <div className="rounded-lg p-6 shadow border border-amber-200 bg-amber-50">
          <p className="text-amber-800">Học viên hiện chưa được gán học phí. Vui lòng gán học phí từ trang lớp học.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Học phí - Học viên #{studentId}</h1>
        <div className="flex items-center gap-2">
          {scheduleOptionsForPayment.length > 0 && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Thanh toán
            </button>
          )}
          <button onClick={fetchData} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Làm mới dữ liệu</button>
        </div>
      </div>

      {data && (
        <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                Chi tiết cấu thành học phí
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                    <span className="block text-gray-500 mb-1">Giá niêm yết (Gốc)</span>
                    <span className="text-lg font-medium text-gray-900">
                        <CurrencyDisplay amount={(data.totalPaid + data.currentBalance) + (data.totalWaived || 0)} />
                    </span>
                </div>
                <div>
                    <span className="block text-gray-500 mb-1">Giảm giá / Học bổng</span>
                    <span className="text-lg font-medium text-green-600">
                        - <CurrencyDisplay amount={data.totalWaived || 0} />
                    </span>
                </div>
                <div>
                    <span className="block text-gray-500 mb-1">Tổng phải đóng (Sau giảm)</span>
                    <span className="text-lg font-bold text-indigo-700">
                        <CurrencyDisplay amount={data.totalPaid + data.currentBalance} />
                    </span>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Tổng học phí</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">{data ? formatVND(data.totalPaid + data.currentBalance) : '-'}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Đã thu</p>
          <p className="text-2xl font-bold text-green-700 mt-2">{data ? formatVND(data.totalPaid) : '-'}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow border-l-4 border-red-500">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Còn nợ</p>
          <p className="text-2xl font-bold text-red-700 mt-2">{data ? formatVND(data.currentBalance) : '-'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Lịch Trình Đóng Học Phí</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đợt</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn đóng</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đã đóng</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {schedules.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">Chưa có lịch đóng tiền nào.</td></tr>
                      ) : schedules.map((sch) => {
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const isPast = !!sch.dueDate && sch.dueDate < todayStr;
                          const effectiveStatus = sch.status === 'PENDING' && isPast ? 'OVERDUE' : sch.status;
                          return (
                          <tr key={sch.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  Đợt {sch.installmentNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {sch.dueDate || '---'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                  <CurrencyDisplay amount={sch.expectedAmount} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <CurrencyDisplay amount={sch.paidAmount || 0} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                                      {getStatusLabel(effectiveStatus)}
                                  </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenHistory(sch)}
                                      className="text-gray-600 hover:text-indigo-600 text-xs underline"
                                    >
                                      Lịch sử sửa hạn
                                    </button>
                                    {sch.status !== 'PAID' && sch.status !== 'CANCELLED' && (
                                      <span className="text-xs text-gray-400">Thanh toán qua nút trên</span>
                                    )}
                                    {sch.status === 'PAID' && (
                                      <span className="text-green-600 flex items-center justify-end gap-1">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                          Hoàn thành
                                      </span>
                                    )}
                                  </div>
                              </td>
                          </tr>
                      );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        schedule={scheduleOptionsForPayment[0] ?? null}
        availableSchedules={scheduleOptionsForPayment}
        onSuccess={() => {
          fetchData();
        }}
      />

      <HistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        schedule={historySchedule}
        loading={historyLoading}
        error={historyError}
        entries={historyEntries}
      />
    </div>
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
