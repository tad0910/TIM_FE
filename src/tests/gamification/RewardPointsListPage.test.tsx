import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RewardPointsListPage from '../../pages/admin/RewardPointsListPage';
import * as gamificationApi from '../../services/gamificationApi';
import * as userApi from '../../services/userApi';

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
jest.mock('../../services/userApi');

const mockNavigate = jest.fn();
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showError: showErrorMock,
    showSuccess: showSuccessMock,
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

jest.mock('../../components/TableSkeleton', () => ({
  __esModule: true,
  default: () => <div>Loading...</div>,
}));

const mockPointTypes = [
  {
    id: 1,
    name: 'Chuyên cần',
    description: 'Điểm chuyên cần',
    maxPoints: 1000,
    isActive: true,
    showOnDashboard: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockUser = {
  id: 1,
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
};

describe('RewardPointsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAllPointTypes as jest.Mock).mockResolvedValue(mockPointTypes);
    (userApi.getUserById as jest.Mock).mockResolvedValue(mockUser);
  });

  it('hiển thị danh sách điểm thưởng và cho phép điều hướng', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RewardPointsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Chuyên cần')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/reward-points/create');
  });

  it('cho phép chỉnh sửa điểm thưởng', async () => {
    (gamificationApi.updatePointType as jest.Mock).mockResolvedValue({
      ...mockPointTypes[0],
      name: 'Điểm đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <RewardPointsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Chuyên cần')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa điểm thưởng')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Chuyên cần');
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

  it('cho phép xóa điểm thưởng', async () => {
    (gamificationApi.deletePointType as jest.Mock).mockResolvedValue(undefined);

    await act(async () => {
      render(
        <BrowserRouter>
          <RewardPointsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Chuyên cần')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await act(async () => {
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });

    await waitFor(() => {
      expect(gamificationApi.deletePointType).toHaveBeenCalledWith(1);
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã xóa loại điểm thưởng thành công');
    });
  });
});
