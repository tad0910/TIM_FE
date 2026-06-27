import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateRewardPointPage from '../../pages/admin/CreateRewardPointPage';
import * as gamificationApi from '../../services/gamificationApi';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  BASE_URL: 'http://localhost:8081',
}));

jest.mock('../../services/gamificationApi');

const mockUser = { id: '1' };
const mockNavigate = jest.fn();
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();
const showWarningMock = jest.fn();

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showError: showErrorMock,
    showSuccess: showSuccessMock,
    showWarning: showWarningMock,
    hideNotification: jest.fn(),
  }),
}));

jest.mock('../../components/NotificationPopup', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/AdminPageHeader', () => ({
  __esModule: true,
  default: ({ title }: any) => <h1>{title}</h1>,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

describe('CreateRewardPointPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tạo loại điểm thưởng mới thành công', async () => {
    (gamificationApi.createPointType as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Điểm mới',
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateRewardPointPage />
        </BrowserRouter>
      );
    });

    const nameInput = screen.getByLabelText(/Tên điểm/i);
    await act(async () => {
      await userEvent.type(nameInput, 'Điểm mới');
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.createPointType).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo loại điểm thưởng thành công');
    });
  });

  it('chỉnh sửa loại điểm thưởng thành công', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ pointTypeId: '1' });
    (gamificationApi.getPointTypeById as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Điểm cũ',
      description: 'Mô tả cũ',
      maxPoints: 1000,
      isActive: true,
      showOnDashboard: true,
      createdAt: '2024-01-01T00:00:00Z',
    });
    (gamificationApi.updatePointType as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Điểm đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateRewardPointPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Điểm cũ')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Điểm cũ');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Điểm đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.updatePointType).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật loại điểm thưởng thành công');
    });
  });

  it('hiển thị lỗi khi thiếu tên điểm', async () => {
    // Reset useParams to ensure no pointTypeId
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({});
    
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateRewardPointPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm mới/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    
    // Submit form without filling required fields
    await act(async () => {
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        fireEvent.click(submitButton);
      }
    });

    await waitFor(() => {
      expect(showWarningMock).toHaveBeenCalledWith('Thiếu thông tin', 'Vui lòng nhập tên điểm');
    }, { timeout: 3000 });
  });
});
