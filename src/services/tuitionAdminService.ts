import api, { BASE_URL } from './api';
import type { TuitionOverview } from '../types/tuition';
import type { Page } from './tuitionRouteApi';

export interface AdminPaymentRequest {
  studentId: number;
  amount: number;
  paymentMethod: string;
  note?: string;
  scheduleId?: number | null;
}

export interface PayResponse {
  message: string;
  receiptId: number;
  receiptCode: string;
  amount: number;
}

export interface StudentPaymentScheduleDTO {
    id: number;
    studentTuitionId?: number;
    installmentNumber: number;
    expectedAmount: number;
    paidAmount?: number;
    fromDate?: string;
    dueDate?: string;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

export interface StudentPaymentScheduleHistoryDTO {
  id: number;
  scheduleId: number;
  oldDueDate: string | null;
  newDueDate: string;
  reason?: string | null;
  modifiedByUserId?: number | null;
  modifiedByUsername?: string | null;
  createdAt: string;
}

export interface AdjustFeeRequest {
  studentTuitionId: number;
  amount: number; 
  isFixedAmount: boolean; 
  reason?: string;
}

export interface UpdateScheduleDueDatePayload {
  scheduleId: number;
  dueDate: string;
  reason?: string;
}

export interface TuitionTransactionDTO {
  id: number;
  transactionType: string;
  amount: number;
  transactionDate: string;
  description?: string;
  performedBy?: string;
  receiptId?: number;
  receiptCode?: string;
}

const TuitionAdminService = {
  getAdminOverview(): Promise<TuitionOverview> {
    return api.get<TuitionOverview>('/api/tuition-overview/admin');
  },

  getStudentOverview(studentId: number): Promise<TuitionOverview> {
    return api.get<TuitionOverview>(`/api/tuition-overview/student/${studentId}`);
  },
  
  getStudentSchedules(studentId: number): Promise<StudentPaymentScheduleDTO[]> {
      return api.get<StudentPaymentScheduleDTO[]>(`/api/tuition-overview/student/${studentId}/schedules`);
  },

  payTuition(body: AdminPaymentRequest): Promise<PayResponse> {
    return api.post<PayResponse>('/api/tuition-payment/pay', body);
  },

  adjustTuitionFee(payload: AdjustFeeRequest) {
    return api.put('/api/student-tuition/adjust-fee', payload);
  },

  updateScheduleDueDate({ scheduleId, dueDate, reason }: UpdateScheduleDueDatePayload) {
    return api.put(`/api/student-tuition/schedules/${scheduleId}/due-date`, {
      dueDate,
      reason,
    });
  },

  registerStudentTuition(payload: { studentId: number; routeId: number; enrollmentDate?: string; couponCode?: string }) {
    return api.post('/api/student-tuition/register', payload);
  },

  async downloadReceipt(receiptId: number): Promise<void> {
    const url = `${BASE_URL.replace(/\/$/, '')}/api/receipts/${receiptId}/download`;
    const token = localStorage.getItem('auth_token') || '';
    const previewWin = window.open('about:blank');
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      credentials: 'include',
      mode: 'cors',
    });
    if (resp.status === 401) throw new Error('Unauthorized (401)');
    if (resp.status === 403) throw new Error('Forbidden (403)');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const blob = await resp.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    try { if (previewWin && !previewWin.closed) previewWin.location.href = objectUrl; } catch {}
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `receipt_${receiptId}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
      if (a.parentNode) document.body.removeChild(a);
      try { if (previewWin && !previewWin.closed) previewWin.close(); } catch {}
    }, 5000);
  },

  getAdminTransactions(page = 0, size = 10) {
    return api.get<Page<TuitionTransactionDTO>>('/api/tuition-overview/admin/transactions', { page, size });
  },

  getScheduleHistory(scheduleId: number) {
    return api.get<StudentPaymentScheduleHistoryDTO[]>(`/api/student-tuition/schedules/${scheduleId}/history`);
  },
};

export default TuitionAdminService;
