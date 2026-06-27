import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StudentTuitionAdjustFeeModal from '../../pages/admin/StudentTuitionAdjustFeeModal';

const updateScheduleDueDateMock = jest.fn();
const showWarningMock = jest.fn();
const showSuccessMock = jest.fn();

jest.mock('../../services/tuitionAdminService', () => ({
  __esModule: true,
  default: {
    updateScheduleDueDate: (...args: unknown[]) => updateScheduleDueDateMock(...args),
  },
}));

jest.mock('../../components/NotificationPopup', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showSuccess: showSuccessMock,
    showWarning: showWarningMock,
    showApiError: jest.fn(),
    hideNotification: jest.fn(),
  }),
}));

const pendingSchedules = [
  { id: 1, installmentNumber: 1, expectedAmount: 1_000_000, dueDate: '2024-12-05' },
  { id: 2, installmentNumber: 2, expectedAmount: 2_000_000, dueDate: '2025-01-10' },
] as any;

describe('StudentTuitionAdjustFeeModal', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    updateScheduleDueDateMock.mockResolvedValue(undefined);
    updateScheduleDueDateMock.mockClear();
    showWarningMock.mockClear();
    showSuccessMock.mockClear();
  });

  beforeAll(() => {
    const originalError = console.error;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('act(')) {
        return;
      }
      originalError.call(console, ...args);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('submits due date update with selected schedule', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      render(
        <StudentTuitionAdjustFeeModal
          open
          onClose={onClose}
          studentTuitionId={90001}
          pendingSchedules={pendingSchedules}
          onSuccess={onSuccess}
        />
      );
    });

    const dateInput = screen.getByLabelText('Hạn đóng mới');
    fireEvent.change(dateInput, { target: { value: '2024-12-20' } });

    const saveButton = screen.getByRole('button', { name: 'Lưu hạn mới' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateScheduleDueDateMock).toHaveBeenCalledWith({
        scheduleId: 1,
        dueDate: '2024-12-20',
        reason: undefined,
      });
    });

    expect(showSuccessMock).toHaveBeenCalledWith('Đã cập nhật hạn đóng');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when no pending schedules', async () => {
    await act(async () => {
      render(
        <StudentTuitionAdjustFeeModal
          open
          onClose={() => {}}
          studentTuitionId={90001}
          pendingSchedules={[]}
        />
      );
    });

    const saveButton = screen.getByRole('button', { name: 'Lưu hạn mới' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('disables submit when due date is cleared', async () => {
    await act(async () => {
      render(
        <StudentTuitionAdjustFeeModal
          open
          onClose={() => {}}
          studentTuitionId={90001}
          pendingSchedules={pendingSchedules}
        />
      );
    });

    const dateInput = screen.getByLabelText('Hạn đóng mới');
    fireEvent.change(dateInput, { target: { value: '' } });

    const saveButton = screen.getByRole('button', { name: 'Lưu hạn mới' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});
