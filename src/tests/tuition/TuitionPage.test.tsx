import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TuitionPage from '../../modules/profile/pages/TuitionPage';

// Mock api base để tránh import.meta trong api.ts
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  BASE_URL: 'http://localhost:8081',
}));

jest.mock('../../services/tuitionService', () => ({
  __esModule: true,
  default: {
    getTuitionOverview: jest.fn().mockResolvedValue({
      totalPaid: 0,
      currentBalance: 0,
      totalWaived: 0,
    }),
    getPaymentHistory: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/tuitionAdminService', () => ({
  __esModule: true,
  default: {
    getStudentSchedules: jest.fn().mockResolvedValue([
      {
        id: 1,
        studentTuitionId: 100,
        installmentNumber: 1,
        expectedAmount: 1000000,
        paidAmount: 0,
        dueDate: '2099-01-01', // luôn là tương lai
        status: 'PENDING',
      },
      {
        id: 2,
        studentTuitionId: 100,
        installmentNumber: 2,
        expectedAmount: 2000000,
        paidAmount: 0,
        dueDate: '2000-01-01', // luôn là quá khứ
        status: 'PENDING',
      },
    ]),
  },
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: '30002' },
    }),
}));

describe('TuitionPage - trạng thái các đợt học phí', () => {
  it('hiển thị đúng "Chưa đến ngày" và "Quá hạn" cho các đợt PENDING theo dueDate', async () => {
    render(<TuitionPage />);

    // Đợi dữ liệu load xong và section groupedSchedules xuất hiện
    await screen.findByText('Các hồ sơ học phí & đợt còn nợ');

    // Mở chi tiết hồ sơ đầu tiên (bỏ qua nút "Xem chi tiết" ở card tổng quan)
    const detailButtons = screen.getAllByRole('button', { name: /xem chi tiết/i });
    // Theo layout hiện tại: button[0] là ở card tổng quan, button[1] là ở block hồ sơ học phí
    const groupDetailButton = detailButtons[detailButtons.length - 1];
    fireEvent.click(groupDetailButton);

    await waitFor(() => {
      expect(screen.getByText('Đợt 1')).toBeInTheDocument();
      expect(screen.getByText('Đợt 2')).toBeInTheDocument();
    });

    // Do PaymentStatusTag render text, chỉ cần kiểm tra text xuất hiện
    expect(screen.getByText('Chưa đến ngày')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
  });
});
