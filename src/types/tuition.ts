export interface TuitionOverview {
  totalPaid: number;
  currentBalance: number;
  totalWaived: number;
  
  totalAmount?: number;
  currency?: string;
  
  studentName?: string;
  studentCode?: string;
  routeName?: string;
  listedAmount?: number;
  discountAmount?: number;
}

export interface PaymentHistory {
  id: number;
  receiptCode: string;
  description: string;
  amount: number;
  paymentDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  receiptUrl?: string;
}

export interface UpcomingPayment {
  id: number;
  installmentNumber: number;
  expectedAmount: number;
  dueDate: string;
  status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
  description: string;
}

export interface TuitionTransaction {
  id: number;
  studentTuition: {
    id: number;
    student: {
      id: number;
      username: string;
      fullName: string;
    };
    tuitionRoute: {
      id: number;
      name: string;
    };
  };
  transactionType: 'PAYMENT' | 'REFUND' | 'EXCEPTION' | 'USAGE' | 'SCHOLARSHIP';
  amount: number;
  transactionDate: string;
  description: string;
  receipt?: {
    id: number;
    receiptCode: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  };
}
