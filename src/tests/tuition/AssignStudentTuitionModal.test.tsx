import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssignStudentTuitionModal from '../../pages/admin/AssignStudentTuitionModal';

const getAllRoutesMock = jest.fn();
const getAllCouponsMock = jest.fn();
const registerStudentTuitionMock = jest.fn();

jest.mock('../../services/tuitionRouteApi', () => ({
  __esModule: true,
  default: {
    getAllTuitionRoutesAsArray: (...args: any[]) => getAllRoutesMock(...args),
  },
}));

jest.mock('../../services/couponApi', () => ({
  __esModule: true,
  couponApi: {
    getAll: (...args: any[]) => getAllCouponsMock(...args),
  },
}));

jest.mock('../../services/tuitionAdminService', () => ({
  __esModule: true,
  default: {
    registerStudentTuition: (...args: any[]) => registerStudentTuitionMock(...args),
  },
}));

jest.mock('../../components/NotificationPopup', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showSuccess: jest.fn(),
    showError: jest.fn(),
    hideNotification: jest.fn(),
  }),
}));

const student = { id: 30002, name: 'Test Student' };

describe('AssignStudentTuitionModal', () => {
  beforeEach(() => {
    getAllRoutesMock.mockResolvedValue([
      {
        id: 10,
        name: 'Route A',
        type: 'PROGRAM',
        programId: 1,
        numberOfInstallments: 2,
        totalListedFee: 5_000_000,
        installmentConfigs: [],
      },
    ]);

    getAllCouponsMock.mockResolvedValue([
      {
        id: 1,
        code: 'COUPON10',
        active: true,
        discountType: 'PERCENT',
        discountValue: 10,
        scenario: 'DEDUCT_FIRST_FULL',
      },
    ]);

    registerStudentTuitionMock.mockResolvedValue({});
  });

  it('gửi request registerStudentTuition khi submit thành công', async () => {
    const onClose = jest.fn();

    render(
      <AssignStudentTuitionModal
        open={true}
        onClose={onClose}
        student={student}
        programId={1}
        programName="CT 1"
      />
    );

    // Đợi route & coupon được load (option Route A xuất hiện)
    await screen.findByText(/Route A/i);

    // Chọn coupon: lấy select thứ hai (select coupon) theo role combobox
    const selects = screen.getAllByRole('combobox');
    const couponSelect = selects[1];
    fireEvent.change(couponSelect, { target: { value: 'COUPON10' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /xác nhận gán/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerStudentTuitionMock).toHaveBeenCalled();
    });

    const call = registerStudentTuitionMock.mock.calls[0][0];
    expect(call.studentId).toBe(30002);
    expect(call.routeId).toBe(10);
    expect(call.couponCode).toBe('COUPON10');
  });
});
