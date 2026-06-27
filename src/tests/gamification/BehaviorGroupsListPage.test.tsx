import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BehaviorGroupsListPage from '../../pages/admin/BehaviorGroupsListPage';
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
  sortGroupsByStoredOrder: jest.fn((groups) => groups || []),
  insertGroupWithOrder: jest.fn(),
  removeGroupFromOrder: jest.fn(),
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

const mockGroups = [
  {
    id: 1,
    name: 'Nhóm hành vi học tập',
    displayOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Nhóm hành vi tương tác',
    displayOrder: 2,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

describe('BehaviorGroupsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockResolvedValue(mockGroups);
    (behaviorSettings.sortGroupsByStoredOrder as jest.Mock).mockImplementation((groups) => groups || []);
  });

  it('hiển thị danh sách nhóm hành vi và cho phép điều hướng', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorGroupsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nhóm hành vi học tập')).toBeInTheDocument();
      expect(screen.getByText('Nhóm hành vi tương tác')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm nhóm hành vi/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    expect(await screen.findByRole('heading', { name: 'Thêm nhóm hành vi' })).toBeInTheDocument();
  });

  it('cho phép chỉnh sửa nhóm hành vi', async () => {
    (gamificationApi.updateBehaviorGroup as jest.Mock).mockResolvedValue({
      ...mockGroups[0],
      name: 'Nhóm đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorGroupsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nhóm hành vi học tập')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Sửa/i });
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Sửa nhóm hành vi')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Nhóm hành vi học tập');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Nhóm đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.updateBehaviorGroup).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật nhóm hành vi');
    });
  });

  it('cho phép xóa nhóm hành vi', async () => {
    (gamificationApi.deleteBehaviorGroup as jest.Mock).mockResolvedValue(undefined);

    await act(async () => {
      render(
        <BrowserRouter>
          <BehaviorGroupsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nhóm hành vi học tập')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Xóa nhóm hành vi')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await act(async () => {
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });

    await waitFor(() => {
      expect(gamificationApi.deleteBehaviorGroup).toHaveBeenCalledWith(1);
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã xóa nhóm hành vi');
    });
  });
});
