import { useState, useEffect, useMemo } from 'react';
import TuitionService from '../../../services/tuitionService';
import CurrencyDisplay from '../../../components/tuition/CurrencyDisplay';
import PaymentStatusTag from '../../../components/tuition/PaymentStatusTag';
import LoadingSpinner from '../../../components/tuition/LoadingSpinner';
import type { TuitionOverview, PaymentHistory } from '../../../types/tuition';
import TuitionAdminService, { type StudentPaymentScheduleDTO } from '../../../services/tuitionAdminService';
import { useAuthStore } from '../../../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEye } from '@fortawesome/free-solid-svg-icons';
import { getUserProfile, getUserById } from '../../../services/profileApi';

export default function TuitionPage() {
  const [overview, setOverview] = useState<TuitionOverview | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [schedules, setSchedules] = useState<StudentPaymentScheduleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadProfileName = async () => {
      try {
        if (!user?.id) return;
        const profile = await getUserProfile(user.id);
        let name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
        if (!name && (profile as any).name) name = String((profile as any).name);
        if (name) {
          setFullName(name);
          return;
        }
        const userRes = await getUserById(user.id);
        const fallback = [userRes.firstName, userRes.lastName].filter(Boolean).join(' ').trim();
        setFullName(fallback || null);
      } catch {
        setFullName(null);
      }
    };
    loadProfileName();
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overviewData = await TuitionService.getTuitionOverview();
      setOverview(overviewData);

      try {
        const historyData = await TuitionService.getPaymentHistory();
        setPaymentHistory(historyData);
      } catch (historyErr) {
        console.warn('Payment history endpoint not available or failed:', historyErr);
        setPaymentHistory([]);
      }

      try {
        if (user?.id != null) {
          const scheds = await TuitionAdminService.getStudentSchedules(Number(user.id));
          setSchedules(scheds || []);
        } else {
          setSchedules([]);
        }
      } catch (schedErr) {
        console.warn('Failed to load student schedules:', schedErr);
        setSchedules([]);
      }
    } catch (err) {
      console.error('Failed to load tuition data:', err);
      setError('Không thể tải dữ liệu học phí. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (receiptId: number) => {
    try {
      const blob = await TuitionService.downloadReceipt(receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${receiptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download receipt:', err);
      setError('Không thể tải biên lai. Vui lòng thử lại sau.');
    }
  };

  const totalAmount = overview ? ((overview as any).totalAmount ?? 0) : 0;
  const paidAmount = overview ? ((overview as any).paidAmount ?? (overview as any).totalPaid ?? 0) : 0;
  const remainingAmount = overview ? ((overview as any).remainingAmount ?? (overview as any).currentBalance ?? 0) : 0;
  const waivedAmount = overview ? ((overview as any).waivedAmount ?? (overview as any).totalWaived ?? 0) : 0;

  const groupedSchedules = useMemo(() => {
    const groups: Record<number, { tuitionId: number; items: StudentPaymentScheduleDTO[]; totalDebt: number }> = {};
    for (const sch of schedules) {
      const key = sch.studentTuitionId ?? 0;
      if (!key) continue;
      if (!groups[key]) groups[key] = { tuitionId: key, items: [], totalDebt: 0 };
      groups[key].items.push(sch);
      const expected = Number(sch.expectedAmount ?? 0);
      const paid = Number(sch.paidAmount ?? 0);
      const remaining = Math.max(expected - paid, 0);
      if (sch.status !== 'PAID' && remaining > 0) {
        groups[key].totalDebt += remaining;
      }
    }
    return Object.values(groups).filter(g => g.totalDebt > 0);
  }, [schedules]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Đang tải dữ liệu học phí...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FontAwesomeIcon icon={faEye} size="3x" />
          </div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {(fullName && fullName.trim()) || (user as any)?.fullName || (user as any)?.name || user?.username || 'Học viên'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border bg-white p-5">
            <div className="text-xs font-medium text-gray-500 mb-1">Tổng học phí toàn khóa</div>
            <div className="text-2xl font-bold text-gray-900">
              <CurrencyDisplay amount={totalAmount} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="text-xs font-medium text-gray-500 mb-1">Đã thanh toán</div>
            <div className="text-2xl font-bold text-gray-900">
              <CurrencyDisplay amount={paidAmount} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="text-xs font-medium text-gray-500 mb-1">Nợ hiện tại</div>
            <div className="text-2xl font-bold text-gray-900">
              <CurrencyDisplay amount={remainingAmount} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="text-xs font-medium text-gray-500 mb-1">Được miễn giảm</div>
            <div className="text-2xl font-bold text-gray-900">
              <CurrencyDisplay amount={waivedAmount} />
            </div>
          </div>
        </div>

        {groupedSchedules.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                Các hồ sơ học phí & đợt còn nợ
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedSchedules.map((group, idx) => (
                <div key={group.tuitionId} className="px-6 py-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Hồ sơ học phí #{group.tuitionId || idx + 1}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tổng nợ còn lại:&nbsp;
                      <span className="font-medium text-red-600">
                        <CurrencyDisplay amount={group.totalDebt} />
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left border">Đợt</th>
                          <th className="px-4 py-2 text-left border">Hạn đóng</th>
                          <th className="px-4 py-2 text-right border">Số tiền</th>
                          <th className="px-4 py-2 text-right border">Đã đóng</th>
                          <th className="px-4 py-2 text-right border">Còn nợ</th>
                          <th className="px-4 py-2 text-left border">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((sch) => {
                          const expected = Number(sch.expectedAmount ?? 0);
                          const paid = Number(sch.paidAmount ?? 0);
                          const remaining = Math.max(expected - paid, 0);
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const isFuture = !!sch.dueDate && sch.dueDate > todayStr;
                          const isPast = !!sch.dueDate && sch.dueDate < todayStr;
                          let statusForTag: any = sch.status;
                          if (sch.status === 'PENDING') {
                            if (isFuture) statusForTag = 'UPCOMING';
                            else if (isPast) statusForTag = 'OVERDUE';
                          }
                          return (
                            <tr key={sch.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 border">Đợt {sch.installmentNumber}</td>
                              <td className="px-4 py-2 border">{sch.dueDate || '-'}
                              </td>
                              <td className="px-4 py-2 border text-right"><CurrencyDisplay amount={expected} /></td>
                              <td className="px-4 py-2 border text-right"><CurrencyDisplay amount={paid} /></td>
                              <td className="px-4 py-2 border text-right text-red-600"><CurrencyDisplay amount={remaining} /></td>
                              <td className="px-4 py-2 border text-left text-xs">
                                <PaymentStatusTag status={statusForTag as any} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              Danh sách phiếu thu - hóa đơn
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MÃ HD</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NỘI DUNG THU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HẠN NỘP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SỐ TIỀN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ĐÃ ĐÓNG</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CÒN NỢ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TRẠNG THÁI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <FontAwesomeIcon icon={faEye} className="mx-auto mb-2 text-gray-300" size="2x" />
                      <p>Chưa có dữ liệu phiếu thu/biên lai</p>
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{payment.receiptCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><CurrencyDisplay amount={payment.amount} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><CurrencyDisplay amount={payment.amount} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><CurrencyDisplay amount={0} /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><PaymentStatusTag status={payment.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDownloadReceipt(payment.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
