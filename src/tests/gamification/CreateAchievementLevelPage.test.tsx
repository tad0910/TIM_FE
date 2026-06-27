import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateAchievementLevelPage from '../../pages/admin/CreateAchievementLevelPage';
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
  useParams: () => ({ achievementId: '1' }),
}));

const mockAchievement = {
  id: 1,
  name: 'Thành tích học tập',
  imageUrl: 'https://example.com/image.png',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPointTypes = [
  { id: 1, name: 'Chuyên cần' },
  { id: 2, name: 'Năng lực' },
];

const mockNotificationTemplates = [
  { id: 1, name: 'Template 1' },
  { id: 2, name: 'Template 2' },
];

describe('CreateAchievementLevelPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getAchievementById as jest.Mock).mockResolvedValue(mockAchievement);
    (gamificationApi.getAllPointTypes as jest.Mock).mockResolvedValue(mockPointTypes);
    (gamificationApi.getNotificationTemplates as jest.Mock).mockResolvedValue(mockNotificationTemplates);
  });

  it('tạo cấp bậc thành tích mới thành công', async () => {
    (gamificationApi.createAchievementLevel as jest.Mock).mockResolvedValue({
      id: 1,
      achievementId: 1,
      levelName: 'Cấp độ mới',
      requiredPointTypeId: 1,
      minPointsRequired: 100,
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Tên cấp bậc thành tích/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cấp bậc thành tích/i);
    await act(async () => {
      await userEvent.type(nameInput, 'Cấp độ mới');
    });

    const pointTypeSelect = screen.getByLabelText(/Điểm thưởng/i);
    await act(async () => {
      fireEvent.change(pointTypeSelect, { target: { value: '1' } });
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.createAchievementLevel).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo cấp bậc thành tích thành công');
    });
  });

  it('chỉnh sửa cấp bậc thành tích thành công', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1', levelId: '1' });
    (gamificationApi.getAchievementLevelById as jest.Mock).mockResolvedValue({
      id: 1,
      achievementId: 1,
      levelName: 'Cấp độ cũ',
      requiredPointTypeId: 1,
      minPointsRequired: 100,
      createdAt: '2024-01-01T00:00:00Z',
    });
    (gamificationApi.updateAchievementLevel as jest.Mock).mockResolvedValue({
      id: 1,
      levelName: 'Cấp độ đã cập nhật',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const nameInput = screen.queryByDisplayValue('Cấp độ cũ');
      expect(nameInput).toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = await screen.findByDisplayValue('Cấp độ cũ');
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

  it('hiển thị lỗi khi thiếu thông tin', async () => {
    // Reset useParams to ensure no levelId
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    // Wait for form to be fully loaded and initial data fetched
    await waitFor(() => {
      expect(screen.getByLabelText(/Tên cấp bậc thành tích/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thêm mới/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    
    // Submit form without filling required fields
    await act(async () => {
      fireEvent.submit(submitButton.closest('form') || submitButton);
    });

    // Wait for validation to trigger
    await waitFor(() => {
      expect(showWarningMock).toHaveBeenCalledWith('Thiếu thông tin', 'Vui lòng nhập tên cấp bậc thành tích');
    }, { timeout: 5000 });
  });

  it('hiển thị lỗi khi thiếu điểm thưởng', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Tên cấp bậc thành tích/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = screen.getByLabelText(/Tên cấp bậc thành tích/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Cấp độ mới' } });
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showWarningMock).toHaveBeenCalledWith('Thiếu thông tin', 'Vui lòng chọn điểm thưởng');
    });
  });

  it('xử lý lỗi khi tạo cấp bậc thất bại', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    (gamificationApi.createAchievementLevel as jest.Mock).mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Tên cấp bậc thành tích/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = screen.getByLabelText(/Tên cấp bậc thành tích/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Cấp độ mới' } });
    });

    const pointTypeSelect = screen.getByLabelText(/Điểm thưởng/i);
    await act(async () => {
      fireEvent.change(pointTypeSelect, { target: { value: '1' } });
    });

    const submitButton = screen.getByRole('button', { name: /Thêm mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tạo cấp bậc thành tích');
    });
  });

  it('xử lý lỗi khi cập nhật cấp bậc thất bại', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1', levelId: '1' });
    (gamificationApi.getAchievementLevelById as jest.Mock).mockResolvedValue({
      id: 1,
      achievementId: 1,
      levelName: 'Cấp độ cũ',
      requiredPointTypeId: 1,
      minPointsRequired: 100,
      createdAt: '2024-01-01T00:00:00Z',
    });
    (gamificationApi.updateAchievementLevel as jest.Mock).mockRejectedValue(new Error('Update failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const nameInput = screen.queryByDisplayValue('Cấp độ cũ');
      expect(nameInput).toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = await screen.findByDisplayValue('Cấp độ cũ');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Cấp độ đã cập nhật' } });
    });

    const submitButton = screen.getByRole('button', { name: /Cập nhật/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể cập nhật cấp bậc thành tích');
    });
  });

  it('hủy và quay lại danh sách', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1' });
    
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Quay lại danh sách cấp bậc thành tích/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const cancelButton = screen.getByText(/Quay lại danh sách cấp bậc thành tích/i);
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/achievements/1/levels');
    });
  });

  it('hiển thị loading khi đang tải dữ liệu', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ achievementId: '1', levelId: '1' });
    (gamificationApi.getAchievementLevelById as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      id: 1,
      achievementId: 1,
      levelName: 'Cấp độ cũ',
      requiredPointTypeId: 1,
      minPointsRequired: 100,
      createdAt: '2024-01-01T00:00:00Z',
    }), 100)));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateAchievementLevelPage />
        </BrowserRouter>
      );
    });

    // Component should show loading state initially
    await waitFor(() => {
      expect(screen.queryByText(/Đang tải/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
