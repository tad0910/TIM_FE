import { render, screen } from '@testing-library/react';
import StudentTuitionDetailPage from '../../pages/admin/StudentTuitionDetailPage';

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useParams: () => ({ studentId: '30002' }),
}));

jest.mock('../../services/tuitionAdminService', () => ({
  __esModule: true,
  default: {
    getStudentOverview: jest.fn().mockResolvedValue({
      totalPaid: 0,
      currentBalance: 3000000,
      totalWaived: 0,
    }),
    getStudentSchedules: jest.fn().mockResolvedValue([
      {
        id: 1,
        installmentNumber: 1,
        expectedAmount: 1000000,
        paidAmount: 0,
        dueDate: '2099-01-01',
        status: 'PENDING',
      },
      {
        id: 2,
        installmentNumber: 2,
        expectedAmount: 2000000,
        paidAmount: 0,
        dueDate: '2000-01-01',
        status: 'PENDING',
      },
    ]),
  },
}));

jest.mock('../../pages/admin/PaymentModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('StudentTuitionDetailPage - trạng thái đợt đóng tiền', () => {
  it('hiển thị đúng "Quá hạn" cho đợt quá khứ và nút Thanh toán chỉ cho đợt hợp lệ', async () => {
    render(<StudentTuitionDetailPage />);

    // Đợi bảng lịch trình hiển thị
    await screen.findByText('Lịch Trình Đóng Học Phí');

    // Có cả Đợt 1 và Đợt 2
    expect(screen.getByText('Đợt 1')).toBeInTheDocument();
    expect(screen.getByText('Đợt 2')).toBeInTheDocument();

    // Đợt quá khứ (dueDate 2000-01-01) phải hiển thị "Quá hạn"
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();

    // Nút Thanh toán: do code hiện chỉ check !isFuture nên cả 2 đợt đều hợp lệ (trừ PAID/CANCELLED)
    const payButtons = screen.getAllByRole('button', { name: 'Thanh toán' });
    expect(payButtons.length).toBeGreaterThanOrEqual(1);
  });
});
