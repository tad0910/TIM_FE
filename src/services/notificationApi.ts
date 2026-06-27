import { api } from './api';

export interface NotificationDTO {
  id: number;
  receiverId: number;
  senderId: number | null;
  senderUsername: string;
  senderAvatar: string | null;
  notificationType: string;
  targetType: string | null;
  targetId: number | null;
  title: string;
  content: string;
  iconUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  actionUrl: string | null;
}

export interface NotificationPageResponse {
  content: NotificationDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export interface NotificationFilters {
  page?: number;
  size?: number;
  isRead?: boolean;
  notificationType?: string;
}

export const notificationApi = {
  getNotificationsByUserId: async (
    userId: number, 
    filters: NotificationFilters = {}
  ): Promise<NotificationPageResponse> => {
    const { page = 0, size = 20, isRead, notificationType } = filters;
    
    let queryParams: Record<string, string | number> = { page, size };
    
    if (isRead !== undefined) {
      queryParams.isRead = isRead.toString();
    }
    
    if (notificationType) {
      queryParams.notificationType = notificationType;
    }
    
    return api.get<NotificationPageResponse>(
      `/notifications/user/${userId}`,
      queryParams
    );
  },

  getUnreadNotifications: async (userId: number): Promise<NotificationDTO[]> => {
    return api.get<NotificationDTO[]>(`/notifications/user/${userId}/unread`);
  },

  getUnreadNotificationCount: async (userId: number): Promise<number> => {
    return api.get<number>(`/notifications/user/${userId}/unread-count`);
  },

  markAllAsRead: async (userId: number): Promise<string> => {
    return api.put<string>(`/notifications/user/${userId}/mark-all-read`);
  },

  markAsRead: async (notificationId: number, userId: number): Promise<string> => {
    return api.put<string>(
      `/notifications/${notificationId}/mark-read`,
      {}
    );
  },

  getNotificationsByType: async (
    userId: number,
    notificationType: string,
    filters: Omit<NotificationFilters, 'notificationType'> = {}
  ): Promise<NotificationPageResponse> => {
    const { page = 0, size = 20 } = filters;
    
    return api.get<NotificationPageResponse>(
      `/notifications/user/${userId}/type/${notificationType}`,
      { page, size }
    );
  },
  
  getReadNotifications: async (
    userId: number,
    filters: Omit<NotificationFilters, 'isRead'> = {}
  ): Promise<NotificationPageResponse> => {
    return notificationApi.getNotificationsByUserId(userId, {
      ...filters,
      isRead: true
    });
  }
};

export default notificationApi;
