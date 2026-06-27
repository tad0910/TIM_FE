import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AchievementLevelsListPage from '../../pages/admin/AchievementLevelsListPage';
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

const mockNavigate = jest.fn();
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ achievementId: '1' }),
}));

const showApiErrorMock = jest.fn();

jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showError: showErrorMock,
    showSuccess: showSuccessMock,
    showApiError: showApiErrorMock,
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

const mockAchievement = {
  id: 1,
  name: 'Thành tích học tập',
  imageUrl: 'https://example.com/image.png',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockLevels = [
  {
    id: 1,
    achievementId: 1,
    levelName: 'Cấp độ 1',
    requiredPointTypeId: 1,
    requiredPointTypeEnum: 'DILIGENCE',
    minPointsRequired: 100,
    imageUrl: 'https://example.com/level.png',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockPointTypes = [
  { id: 1, name: 'Chuyên cần' },
  { id: 2, name: 'Năng lực' },
];

const mockNotificationTemplates = [
  { id: 1, name: 'Template 1' },
  { id: 2, name: 'Template 2' },
];

describe('AchievementLevelsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAchievementById as jest.Mock).mockResolvedValue(mockAchievement);
    (gamificationApi.getAchievementLevels as jest.Mock).mockResolvedValue(mockLevels);
    (gamificationApi.getAllPointTypes as jest.Mock).mockResolvedValue(mockPointTypes);
    (gamificationApi.getNotificationTemplates as jest.Mock).mockResolvedValue(mockNotificationTemplates);
  });

  it('hiển thị danh sách cấp bậc thành tích', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });
  });

  it('cho phép chỉnh sửa cấp bậc', async () => {
    (gamificationApi.updateAchievementLevel as jest.Mock).mockResolvedValue({
      ...mockLevels[0],
      levelName: 'Cấp độ đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Cấp độ 1');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Cấp độ đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.updateAchievementLevel).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã cập nhật cấp bậc thành tích thành công');
    });
  });

  it('cho phép xóa cấp bậc', async () => {
    (gamificationApi.deleteAchievementLevel as jest.Mock).mockResolvedValue(undefined);

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
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
      expect(gamificationApi.deleteAchievementLevel).toHaveBeenCalledWith(1);
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã xóa cấp bậc thành tích thành công');
    });
  });

  it('hiển thị lỗi khi validation thất bại khi chỉnh sửa', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    // Clear point type selection to trigger validation
    const pointTypeSelect = screen.getByLabelText(/Điểm thưởng/i);
    await act(async () => {
      fireEvent.change(pointTypeSelect, { target: { value: '' } });
    });

    // Submit form to trigger validation
    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        fireEvent.click(submitButton);
      }
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Vui lòng chọn điểm thưởng');
    }, { timeout: 3000 });
  });

  it('hiển thị lỗi khi cập nhật thất bại', async () => {
    (gamificationApi.updateAchievementLevel as jest.Mock).mockRejectedValue(new Error('Update failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể cập nhật cấp bậc thành tích');
    });
  });

  it('hiển thị lỗi khi xóa thất bại', async () => {
    (gamificationApi.deleteAchievementLevel as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
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
      expect(showApiErrorMock).toHaveBeenCalled();
    });
  });

  it('cho phép điều hướng đến trang tạo mới', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements/1/levels/create');
  });

  it('cho phép quay lại danh sách thành tích', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Quay lại danh sách thành tích/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements');
  });

  it('hiển thị loading state', async () => {
    (gamificationApi.getAchievementLevels as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockLevels), 100)));
    
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    // Should show loading initially
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('xử lý lỗi khi fetch data thất bại', async () => {
    (gamificationApi.getAchievementLevels as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
    
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(showApiErrorMock).toHaveBeenCalled();
    });
  });

  it('hủy xóa cấp bậc', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Xóa');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Hủy/i });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Xác nhận xóa')).not.toBeInTheDocument();
    });
  });

  it('xử lý thay đổi min points input', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const minPointsInput = screen.getByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(minPointsInput, { target: { value: '200' } });
    });

    expect(minPointsInput).toHaveValue('200');
  });

  it('xử lý blur min points input', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const minPointsInput = screen.getByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(minPointsInput, { target: { value: '' } });
      fireEvent.blur(minPointsInput);
    });

    await waitFor(() => {
      expect(minPointsInput).toHaveValue('0');
    });
  });

  it('xử lý chọn file ảnh khi chỉnh sửa', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const fileInput = Array.from(fileInputs).find(input => {
      const label = input.closest('label');
      return label?.textContent?.includes('Chọn file');
    }) as HTMLInputElement;
    
    if (fileInput) {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    }
  });

  it('xử lý thay đổi notification template khi chỉnh sửa', async () => {
    (gamificationApi.getNotificationTemplates as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Template 1' },
      { id: 2, name: 'Template 2' },
    ]);

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText(/Thông báo khi đạt/i);
    await act(async () => {
      fireEvent.change(templateSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Đang chọn: Template 1/i)).toBeInTheDocument();
    });
  });

  it('xử lý image error fallback', async () => {
    const levelWithImage = {
      ...mockLevels[0],
      imageUrl: 'https://invalid-url.com/image.png',
    };
    (gamificationApi.getAchievementLevels as jest.Mock).mockResolvedValue([levelWithImage]);

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const img = screen.getByAltText('Cấp độ 1');
      expect(img).toBeInTheDocument();
      fireEvent.error(img);
    });

    await waitFor(() => {
      const img = screen.getByAltText('Cấp độ 1') as HTMLImageElement;
      expect(img.src).toContain('placeholder.com');
    });
  });

  it('hiển thị empty state khi không có cấp bậc', async () => {
    (gamificationApi.getAchievementLevels as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Không có dữ liệu/i)).toBeInTheDocument();
    });
  });

  it('đóng modal chỉnh sửa', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AchievementLevelsListPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cấp độ 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Sửa');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cấp bậc thành tích')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×').closest('button');
    if (closeButton) {
      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Chỉnh sửa cấp bậc thành tích')).not.toBeInTheDocument();
      });
    }
  });
});
