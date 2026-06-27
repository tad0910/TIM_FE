import api, { BASE_URL } from './api';
import type { TuitionOverview, PaymentHistory, UpcomingPayment } from '../types/tuition';

export class TuitionService {
  static async getTuitionOverview(): Promise<TuitionOverview> {
    const dto = await api.get<any>(`/api/tuition-overview/my-overview`);
    const totalPaid = Number(dto?.totalPaid ?? 0);
    const totalUsed = Number(dto?.totalUsed ?? 0);
    const currentBalance = Number(dto?.currentBalance ?? 0);

    const mapped: TuitionOverview = {
      totalAmount: totalUsed + currentBalance,
      paidAmount: totalPaid,
      remainingAmount: currentBalance,
      waivedAmount: Number(dto?.totalWaived ?? 0),
      currency: 'VND',
    };
    return mapped;
  }

  static async getPaymentHistory(): Promise<PaymentHistory[]> {
    const page = await api.get<any>(`/api/tuition-overview/my-history`, { page: 0, size: 50 });
    const content = Array.isArray(page?.content) ? page.content : [];
    const mapped: PaymentHistory[] = content.map((tx: any) => {
      const isPayment = String(tx?.transactionType || '').toUpperCase() === 'PAYMENT';
      return {
        id: Number(tx?.id),
        receiptCode: tx?.receipt?.receiptCode || '-',
        description: tx?.description || (isPayment ? 'Thanh toán học phí' : 'Giao dịch học phí'),
        amount: Number(tx?.amount ?? 0),
        paymentDate: tx?.receipt?.paymentDate || tx?.transactionDate || new Date().toISOString(),
        status: isPayment ? 'PAID' : 'PAID',
        receiptUrl: undefined,
      } as PaymentHistory;
    });
    return mapped;
  }

  static async getUpcomingPayments(): Promise<UpcomingPayment[]> {
    return api.get<UpcomingPayment[]>(`/api/student-tuition/upcoming-payments`);
  }

  static async downloadReceipt(receiptId: number): Promise<Blob> {
    const response = await fetch(`${BASE_URL}/api/receipts/${receiptId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }

    return response.blob();
  }
}

export default TuitionService;
