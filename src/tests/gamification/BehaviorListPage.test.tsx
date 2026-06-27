import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BehaviorListPage from '../../pages/admin/BehaviorListPage';
import * as gamificationApi from '../../services/gamificationApi';
import * as behaviorSettings from '../../utils/behaviorSettings';

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
jest.mock('../../utils/behaviorSettings', () => ({
  getBehaviorActivation: jest.fn(() => true),
  setBehaviorActivation: jest.fn(),
  removeBehaviorActivation: jest.fn(),
  sortGroupsByStoredOrder: jest.fn((groups) => groups || []),
}));

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

const mockBehaviorGroups = [
  {
    id: 1,
    name: 'Nhóm hành vi học tập',
    displayOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
    behaviors: [
      {
        id: 1,
        groupId: 1,
        name: 'Tham gia lớp học',
        frequencyType: 'DAILY',
        pointDiligence: 10,
        pointCompetence: 0,
        pointExperience: 0,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
];

describe('BehaviorListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockResolvedValue(mockBehaviorGroups);
  });

  it('hiển thị danh sách hành vi và cho phép điều hướng', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Tham gia lớp học')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm hành vi/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/behaviors/groups/1/add');
  });

  it('cho phép chỉnh sửa hành vi', async () => {
    (gamificationApi.updateBehavior as jest.Mock).mockResolvedValue({
      ...mockBehaviorGroups[0].behaviors[0],
      name: 'Hành vi đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Tham gia lớp học')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa hành vi');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa hành vi')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Tham gia lớp học');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Hành vi đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.updateBehavior).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật hành vi');
    });
  });

  it('cho phép xóa hành vi', async () => {
    (gamificationApi.deleteBehavior as jest.Mock).mockResolvedValue(undefined);
    // Mock getAllBehaviorGroups to return empty behaviors after delete
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockResolvedValueOnce(mockBehaviorGroups).mockResolvedValueOnce([
      {
        ...mockBehaviorGroups[0],
        behaviors: [],
      },
    ]);

    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Tham gia lớp học')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa hành vi');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      // Text is split across elements, so we check for the heading instead
      expect(screen.getByRole('heading', { name: 'Xóa hành vi' })).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await act(async () => {
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });

    await waitFor(() => {
      expect(gamificationApi.deleteBehavior).toHaveBeenCalledWith(1);
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã xóa hành vi');
    });
  });
});
