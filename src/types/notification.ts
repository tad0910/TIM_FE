
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'POST_LIKE'
  | 'POST_COMMENT' 
  | 'POST_SHARE'
  | 'COMMENT_REPLY'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'CLASS_INVITE'
  | 'CLASS_UPDATE'
  | 'COURSE_ASSIGNMENT'
  | 'DEADLINE_REMINDER'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'ACHIEVEMENT_UNLOCKED';

export interface NotificationData {
  postId?: string;
  commentId?: string;
  userId?: string;
  classId?: string;
  courseId?: string;
  actionId?: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationEvent {
  type: 'NEW_NOTIFICATION' | 'NOTIFICATION_READ' | 'NOTIFICATION_DELETED';
  notification: Notification;
  userId: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]: boolean;
  };
}
