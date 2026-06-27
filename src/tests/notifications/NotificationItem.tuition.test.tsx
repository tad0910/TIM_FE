import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationItem from '../../components/NotificationItem';
import type { NotificationDTO } from '../../services/notificationApi';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock avatar service để tránh import.meta trong avatar.ts
jest.mock('../../services/avatar', () => ({
  getImageUrl: (path: string | null) => path || '',
}));

const baseNotification: NotificationDTO = {
  id: 1,
  receiverId: 30002,
  senderId: null,
  senderUsername: 'System',
  senderAvatar: null,
  notificationType: 'TUITION_OVERDUE',
  targetType: 'PAYMENT_SCHEDULE',
  targetId: 123,
  title: 'Nhắc nhở: Học phí quá hạn',
  content: 'Bạn có khoản học phí quá hạn.',
  isRead: false,
  createdAt: new Date().toISOString(),
  readAt: null,
  actionUrl: null,
};

describe('NotificationItem - tuition overdue', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('điều hướng tới /tuition khi click thông báo TUITION_OVERDUE', () => {
    render(
      <MemoryRouter>
        <NotificationItem notification={baseNotification} />
      </MemoryRouter>
    );

    const title = screen.getByText('Nhắc nhở: Học phí quá hạn');
    const item = title.closest('div');
    expect(item).toBeInTheDocument();

    if (!item) return;

    fireEvent.click(item);

    expect(mockNavigate).toHaveBeenCalledWith('/tuition');
  });
});
