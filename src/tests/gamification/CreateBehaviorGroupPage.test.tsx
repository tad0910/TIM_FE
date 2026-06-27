import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateBehaviorGroupPage from '../../pages/admin/CreateBehaviorGroupPage';
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
  insertGroupWithOrder: jest.fn(),
}));

const mockNavigate = jest.fn();
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();
const showWarningMock = jest.fn();

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
}));

const mockGroups = [
  { id: 1, name: 'Nhóm 1', displayOrder: 1 },
  { id: 2, name: 'Nhóm 2', displayOrder: 2 },
];

describe('CreateBehaviorGroupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockResolvedValue(mockGroups);
    (behaviorSettings.insertGroupWithOrder as jest.Mock).mockReturnValue(undefined);
  });

  it('tạo nhóm hành vi mới thành công', async () => {
    (gamificationApi.createBehaviorGroup as jest.Mock).mockResolvedValue({
      id: 3,
      name: 'Nhóm mới',
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Nhóm mới' } });
    });

    const submitButton = screen.getByRole('button', { name: /Tạo nhóm/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.createBehaviorGroup).toHaveBeenCalledWith({ name: 'Nhóm mới' });
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo nhóm hành vi mới');
    });
  });

  it('hiển thị lỗi khi thiếu tên nhóm', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Tạo nhóm/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập tên nhóm');
    });
  });

  it('hiển thị lỗi khi tải danh sách nhóm thất bại', async () => {
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockRejectedValue(new Error('Load failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tải danh sách nhóm hành vi');
    });
  });

  it('hiển thị lỗi khi thứ tự hiển thị không hợp lệ', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Nhóm mới' } });
    });

    // Find order input by type number
    const numberInputs = screen.getAllByRole('spinbutton');
    const orderInput = numberInputs.find((input: HTMLElement) => {
      const inputElement = input as HTMLInputElement;
      return inputElement.min === '1';
    }) || numberInputs[0] as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(orderInput, { target: { value: '0' } });
    });

    // Submit form to trigger validation
    const submitButton = screen.getByRole('button', { name: /Tạo nhóm/i });
    await act(async () => {
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        fireEvent.click(submitButton);
      }
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Thứ tự hiển thị phải là số tự nhiên >= 1');
    }, { timeout: 3000 });
  });

  it('hiển thị lỗi khi tạo nhóm thất bại', async () => {
    (gamificationApi.createBehaviorGroup as jest.Mock).mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Nhóm mới' } });
    });

    const submitButton = screen.getByRole('button', { name: /Tạo nhóm/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tạo nhóm hành vi');
    });
  });

  it('cho phép quay lại danh sách nhóm hành vi', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Quay lại danh sách nhóm hành vi/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/behaviors/groups');
  });

  it('hiển thị loading state khi đang tải dữ liệu', async () => {
    (gamificationApi.getAllBehaviorGroups as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockGroups), 100))
    );

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorGroupPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên nhóm hành vi/i)).toBeInTheDocument();
    });
  });
});
