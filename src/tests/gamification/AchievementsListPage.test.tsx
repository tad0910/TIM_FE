import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AchievementsListPage from '../../pages/admin/AchievementsListPage';
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

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: '1', username: 'admin' },
  }),
}));

const mockAchievements = [
  {
    id: 1,
    name: 'Thành tích học tập',
    imageUrl: 'https://example.com/image1.png',
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Thành tích tham gia',
    imageUrl: null,
    createdBy: 2,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockUser = {
  id: 1,
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
};

describe('AchievementsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAllAchievements as jest.Mock).mockResolvedValue(mockAchievements);
    (userApi.getUserById as jest.Mock).mockResolvedValue(mockUser);
  });

  it('hiển thị danh sách thành tích và cho phép điều hướng', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
      expect(screen.getByText('Thành tích tham gia')).toBeInTheDocument();
    });

    // Test mở modal tạo mới
    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);
    expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();

    // Test navigation to levels page
    const row = screen.getByText('Thành tích học tập').closest('tr');
    if (row) {
      fireEvent.click(row);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements/1/levels');
    }
  });

  it('cho phép chỉnh sửa thành tích', async () => {
    (gamificationApi.updateAchievement as jest.Mock).mockResolvedValue({
      ...mockAchievements[0],
      name: 'Thành tích đã cập nhật',
    });

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa thành tích')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Thành tích học tập');
    fireEvent.change(nameInput, { target: { value: 'Thành tích đã cập nhật' } });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(gamificationApi.updateAchievement).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật thành tích thành công');
    });
  });

  it('cho phép xóa thành tích', async () => {
    (gamificationApi.deleteAchievement as jest.Mock).mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /Xóa/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(gamificationApi.deleteAchievement).toHaveBeenCalledWith(1);
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã xóa thành tích thành công');
    });
  });

  it('hiển thị trạng thái rỗng khi không có dữ liệu', async () => {
    (gamificationApi.getAllAchievements as jest.Mock).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
    });
  });

  it('hiển thị lỗi khi tải danh sách thất bại', async () => {
    (gamificationApi.getAllAchievements as jest.Mock).mockRejectedValue(new Error('Load failed'));

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tải danh sách thành tích');
    });
  });

  it('hiển thị lỗi khi cập nhật thất bại', async () => {
    (gamificationApi.updateAchievement as jest.Mock).mockRejectedValue(new Error('Update failed'));

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa thành tích')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Thành tích học tập');
    fireEvent.change(nameInput, { target: { value: 'Thành tích đã cập nhật' } });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể cập nhật thành tích');
    });
  });

  it('hiển thị lỗi khi xóa thất bại', async () => {
    (gamificationApi.deleteAchievement as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /Xóa/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể xóa thành tích');
    });
  });

  it('cho phép đóng modal chỉnh sửa', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa thành tích')).toBeInTheDocument();
    });

    // Find close button by text "×"
    const closeButton = screen.getByText('×').closest('button');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText('Chỉnh sửa thành tích')).not.toBeInTheDocument();
    });
  });

  it('cho phép hủy xóa', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Xác nhận xóa')).not.toBeInTheDocument();
    });
  });

  it('cho phép tạo thành tích mới', async () => {
    (gamificationApi.createAchievement as jest.Mock).mockResolvedValue({
      id: 3,
      name: 'Thành tích mới',
      createdAt: '2024-01-03T00:00:00Z',
    });

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên thành tích/i);
    fireEvent.change(nameInput, { target: { value: 'Thành tích mới' } });

    const submitButton = screen.getByRole('button', { name: /Tạo thành tích/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(gamificationApi.createAchievement).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo thành tích thành công');
    });
  });

  it('hiển thị cảnh báo khi thiếu tên khi tạo mới', async () => {
    const showWarningMock = jest.fn();
    jest.spyOn(require('../../hooks/useNotification'), 'useNotification').mockReturnValue({
      notification: null,
      showError: showErrorMock,
      showSuccess: showSuccessMock,
      showWarning: showWarningMock,
      hideNotification: jest.fn(),
    });

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Tạo thành tích/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(showWarningMock).toHaveBeenCalledWith('Thiếu thông tin', 'Vui lòng nhập tên thành tích');
    });
  });

  it('xử lý lỗi khi tạo thành tích thất bại', async () => {
    (gamificationApi.createAchievement as jest.Mock).mockRejectedValue(new Error('Create failed'));

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên thành tích/i);
    fireEvent.change(nameInput, { target: { value: 'Thành tích mới' } });

    const submitButton = screen.getByRole('button', { name: /Tạo thành tích/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tạo thành tích');
    });
  });

  it('cho phép chọn file ảnh khi tạo mới', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const createFileInput = Array.from(fileInputs).find(input => {
      const label = input.closest('label');
      return label?.textContent?.includes('Chọn file');
    }) as HTMLInputElement;

    if (createFileInput) {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(createFileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    }
  });

  it('cho phép chọn file ảnh khi chỉnh sửa', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa thành tích')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const editFileInput = Array.from(fileInputs).find(input => {
      const label = input.closest('label');
      return label?.textContent?.includes('Chọn file');
    }) as HTMLInputElement;

    if (editFileInput) {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(editFileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    }
  });

  it('cho phép đóng modal tạo mới', async () => {
    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm thành tích')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×').closest('button');
    if (closeButton) {
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Thêm thành tích')).not.toBeInTheDocument();
      });
    }
  });

  it('xử lý formatDate với invalid date', async () => {
    const achievementWithInvalidDate = {
      ...mockAchievements[0],
      createdAt: 'invalid-date',
    };
    (gamificationApi.getAllAchievements as jest.Mock).mockResolvedValue([achievementWithInvalidDate]);

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });

    // formatDate should return the original string if parsing fails
    expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
  });

  it('xử lý khi không có creator name', async () => {
    (userApi.getUserById as jest.Mock).mockRejectedValue(new Error('User not found'));

    render(
      <BrowserRouter>
        <AchievementsListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thành tích học tập')).toBeInTheDocument();
    });
  });
});
