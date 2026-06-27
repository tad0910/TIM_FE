import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateBehaviorPage from '../../pages/admin/CreateBehaviorPage';
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
  setBehaviorActivation: jest.fn(),
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
  useParams: () => ({ groupId: '1' }),
}));

const mockGroup = {
  id: 1,
  name: 'Nhóm hành vi học tập',
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

describe('CreateBehaviorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationApi.getBehaviorGroupById as jest.Mock).mockResolvedValue(mockGroup);
    (gamificationApi.getAllPointTypes as jest.Mock).mockResolvedValue(mockPointTypes);
    (gamificationApi.getNotificationTemplates as jest.Mock).mockResolvedValue(mockNotificationTemplates);
    (behaviorSettings.setBehaviorActivation as jest.Mock).mockReturnValue(undefined);
  });

  it('tạo hành vi mới thành công', async () => {
    (gamificationApi.createBehavior as jest.Mock).mockResolvedValue({
      id: 1,
      groupId: 1,
      name: 'Hành vi mới',
      frequencyType: 'DAILY',
      pointDiligence: 10,
      createdAt: '2024-01-01T00:00:00Z',
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    // Nhập tên hành vi
    const nameInput = screen.getByPlaceholderText(/Nhập tên hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Hành vi mới' } });
    });

    // Mở modal chọn điểm thưởng
    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    // Đợi modal mở và chọn point type đầu tiên
    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    // Tìm checkbox của point type đầu tiên và tick
    const checkboxes = screen.getAllByRole('checkbox');
    const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox' && !cb.hasAttribute('disabled'));
    if (pointTypeCheckbox) {
      await act(async () => {
        fireEvent.click(pointTypeCheckbox);
      });

      // Nhập điểm cho point type đã chọn
      await waitFor(() => {
        const pointInputs = screen.getAllByPlaceholderText(/VD: 50/i);
        if (pointInputs.length > 0) {
          fireEvent.change(pointInputs[0], { target: { value: '10' } });
        }
      });

      // Lưu lựa chọn
      const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });
    }

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Tạo hành vi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(gamificationApi.createBehavior).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Thành công', 'Đã tạo hành vi mới');
    });
  });

  it('hiển thị lỗi khi thiếu thông tin', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Tạo hành vi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập tên hành vi');
    });
  });

  it('hiển thị lỗi khi không có điểm thưởng', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Hành vi không có điểm' } });
    });

    const submitButton = screen.getByRole('button', { name: /Tạo hành vi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Thiếu cấu hình', 'Vui lòng chọn ít nhất 1 loại điểm thưởng và nhập số điểm.');
    });
  });

  it('xử lý lỗi khi tạo hành vi thất bại', async () => {
    (gamificationApi.createBehavior as jest.Mock).mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nhập tên hành vi/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Hành vi lỗi' } });
    });

    // Mở modal và chọn point type
    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox');
      if (pointTypeCheckbox) {
        fireEvent.click(pointTypeCheckbox);
      }
    });

    await waitFor(() => {
      const pointInputs = screen.queryAllByPlaceholderText(/VD: 50/i);
      if (pointInputs.length > 0) {
        fireEvent.change(pointInputs[0], { target: { value: '10' } });
      }
    });

    const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    const submitButton = screen.getByRole('button', { name: /Tạo hành vi/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tạo hành vi');
    });
  });

  it('thay đổi loại tần suất', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const frequencySelects = screen.getAllByRole('combobox');
    const frequencySelect = frequencySelects.find(select => {
      const label = select.closest('div')?.querySelector('label');
      return label?.textContent?.includes('Loại tần suất');
    }) || frequencySelects[0];
    
    await act(async () => {
      fireEvent.change(frequencySelect, { target: { value: 'WEEKLY' } });
    });

    await waitFor(() => {
      expect(frequencySelect).toHaveValue('WEEKLY');
    });
  });

  it('thay đổi trạng thái kích hoạt', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const offButton = buttons.find(btn => btn.textContent === 'OFF');
    if (offButton) {
      await act(async () => {
        fireEvent.click(offButton);
      });

      await waitFor(() => {
        expect(offButton).toHaveClass('bg-indigo-600');
      });
    }
  });

  it('đóng modal chọn điểm thưởng', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Hủy/i });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Chọn điểm thưởng/i)).not.toBeInTheDocument();
    });
  });

  it('cập nhật điểm cho behavior point type đã chọn', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    // Mở modal và chọn point type
    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox');
    if (pointTypeCheckbox) {
      await act(async () => {
        fireEvent.click(pointTypeCheckbox);
      });

      await waitFor(() => {
        const pointInputs = screen.queryAllByPlaceholderText(/VD: 50/i);
        if (pointInputs.length > 0) {
          fireEvent.change(pointInputs[0], { target: { value: '10' } });
        }
      });

      const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Sau khi lưu, point type sẽ hiển thị trong form
      await waitFor(() => {
        expect(screen.getByText(/Chuyên cần/i)).toBeInTheDocument();
      });

      // Cập nhật điểm cho point type đã chọn
      const pointInputs = screen.getAllByDisplayValue('10');
      if (pointInputs.length > 0) {
        await act(async () => {
          fireEvent.change(pointInputs[0], { target: { value: '20' } });
        });
      }
    }
  });

  it('cập nhật notification template cho behavior point type', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    // Mở modal và chọn point type
    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox');
    if (pointTypeCheckbox) {
      await act(async () => {
        fireEvent.click(pointTypeCheckbox);
      });

      await waitFor(() => {
        const pointInputs = screen.queryAllByPlaceholderText(/VD: 50/i);
        if (pointInputs.length > 0) {
          fireEvent.change(pointInputs[0], { target: { value: '10' } });
        }
      });

      const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Chuyên cần/i)).toBeInTheDocument();
      });

      // Tìm select cho notification template
      const selects = screen.getAllByRole('combobox');
      const templateSelect = selects.find(select => {
        const label = select.closest('div')?.querySelector('label');
        return label?.textContent?.includes('Thông báo');
      });

      if (templateSelect) {
        await act(async () => {
          fireEvent.change(templateSelect, { target: { value: '1' } });
        });
      }
    }
  });

  it('xóa behavior point type bằng cách bỏ chọn trong modal', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    // Mở modal và chọn point type
    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox');
    if (pointTypeCheckbox) {
      // Chọn point type
      await act(async () => {
        fireEvent.click(pointTypeCheckbox);
      });

      await waitFor(() => {
        const pointInputs = screen.queryAllByPlaceholderText(/VD: 50/i);
        if (pointInputs.length > 0) {
          fireEvent.change(pointInputs[0], { target: { value: '10' } });
        }
      });

      const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Chuyên cần/i)).toBeInTheDocument();
      });

      // Mở lại modal và bỏ chọn để xóa
      await act(async () => {
        fireEvent.click(openModalButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
      });

      const checkboxes2 = screen.getAllByRole('checkbox');
      const checkedCheckbox = checkboxes2.find(cb => (cb as HTMLInputElement).checked);
      if (checkedCheckbox) {
        await act(async () => {
          fireEvent.click(checkedCheckbox);
        });

        const saveButton2 = screen.getByRole('button', { name: /Lưu lựa chọn/i });
        await act(async () => {
          fireEvent.click(saveButton2);
        });

        await waitFor(() => {
          expect(screen.queryByText(/Chuyên cần/i)).not.toBeInTheDocument();
        });
      }
    }
  });

  it('xử lý khi không có groupId', async () => {
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ groupId: undefined });

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Thiếu thông tin nhóm hành vi');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/behaviors');
    });
  });

  it('xử lý khi fetch group thất bại', async () => {
    (gamificationApi.getBehaviorGroupById as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Không thể tải thông tin nhóm hành vi');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/gamification/behaviors');
    });
  });

  it('hiển thị loading state', async () => {
    (gamificationApi.getBehaviorGroupById as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockGroup), 100)));

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Đang tải thông tin nhóm hành vi/i)).toBeInTheDocument();
    });
  });

  it('xử lý khi không có point types', async () => {
    (gamificationApi.getAllPointTypes as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chưa có loại điểm thưởng/i)).toBeInTheDocument();
    });
  });

  it('xử lý validation khi apply point type selection thiếu điểm', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CreateBehaviorPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhập tên hành vi/i)).toBeInTheDocument();
    });

    const openModalButton = screen.getByRole('button', { name: /Chọn điểm thưởng/i });
    await act(async () => {
      fireEvent.click(openModalButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chọn điểm thưởng/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const pointTypeCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox');
    if (pointTypeCheckbox) {
      await act(async () => {
        fireEvent.click(pointTypeCheckbox);
      });

      // Không nhập điểm, chỉ tick checkbox
      const saveButton = screen.getByRole('button', { name: /Lưu lựa chọn/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(showErrorMock).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập số điểm cho các loại điểm đã chọn');
      });
    }
  });
});
