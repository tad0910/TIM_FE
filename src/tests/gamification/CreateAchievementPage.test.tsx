import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateAchievementPage from '../../pages/admin/CreateAchievementPage';
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

describe('CreateAchievementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tạo thành tích mới thành công', async () => {
    (gamificationApi.createAchievement as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Thành tích mới',
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    const nameInput = screen.getByLabelText(/Tên thành tích/i);
    await act(async () => {
      await userEvent.type(nameInput, 'Thành tích mới');
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.createAchievement).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo thành tích thành công');
    });
  });

  it('chỉnh sửa thành tích thành công', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    (gamificationApi.getAchievementById as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Thành tích cũ',
      imageUrl: 'https://example.com/image.png',
      createdAt: '2024-01-01T00:00:00Z',
    });
    (gamificationApi.updateAchievement as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Thành tích đã cập nhật',
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Thành tích cũ')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Thành tích cũ');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Thành tích đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.updateAchievement).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật thành tích thành công');
    });
  });

  it('hiển thị lỗi khi thiếu tên thành tích', async () => {
    // Reset useParams to ensure no achievementId
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({});
    
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
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
      expect(showWarningMock).toHaveBeenCalledWith('Thiếu thông tin', 'Vui lòng nhập tên thành tích');
    }, { timeout: 3000 });
  });

  it('hiển thị lỗi khi tải thông tin thành tích thất bại', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    (gamificationApi.getAchievementById as jest.Mock).mockRejectedValue(new Error('Load failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tải thông tin thành tích');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements');
    });
  });

  it('hiển thị lỗi khi tạo thành tích thất bại', async () => {
    // Reset useParams to ensure no achievementId
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({});
    (gamificationApi.createAchievement as jest.Mock).mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm mới/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên thành tích/i);
    await act(async () => {
      await userEvent.type(nameInput, 'Thành tích mới');
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tạo thành tích');
    });
  });

  it('hiển thị lỗi khi cập nhật thành tích thất bại', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    (gamificationApi.getAchievementById as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Thành tích cũ',
      imageUrl: 'https://example.com/image.png',
      createdAt: '2024-01-01T00:00:00Z',
    });
    (gamificationApi.updateAchievement as jest.Mock).mockRejectedValue(new Error('Update failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Thành tích cũ')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể cập nhật thành tích');
    });
  });

  it('cho phép hủy và quay lại', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    const cancelButton = screen.getByRole('button', { name: /Hủy thao tác/i });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements');
  });

  it('cho phép chọn file hình ảnh', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementPage />
        </BrowserRouter>
      );
    });

    // Find file input by its type
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(fileInput.files?.[0]).toBe(file);
  });
});
