import { render, screen } from '@testing-library/react';
import StudentTuitionDetailModal from '../../pages/admin/StudentTuitionDetailModal';

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

jest.mock('../../pages/admin/StudentTuitionAdjustFeeModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('StudentTuitionDetailModal - trạng thái đợt đóng tiền', () => {
  it('hiển thị đúng trạng thái và nút Thanh toán trong modal', async () => {
    render(
      <StudentTuitionDetailModal
        open={true}
        onClose={() => {}}
        studentId={30002}
        studentName="Test Student"
      />
    );

    // Đợi bảng lịch trình hiển thị trong modal
    await screen.findByText('Lịch Trình Đóng Học Phí');

    expect(screen.getByText('Đợt 1')).toBeInTheDocument();
    expect(screen.getByText('Đợt 2')).toBeInTheDocument();

    // Vì modal dùng trực tiếp sch.status, cả 2 đợt PENDING sẽ hiển thị "Chờ thanh toán"
    const pendingLabels = screen.getAllByText('Chờ thanh toán');
    expect(pendingLabels.length).toBeGreaterThanOrEqual(2);

    // Nút Thanh toán hiển thị cho các đợt chưa PAID/CANCELLED
    const payButtons = screen.getAllByRole('button', { name: 'Thanh toán' });
    expect(payButtons.length).toBeGreaterThanOrEqual(1);
  });
});
