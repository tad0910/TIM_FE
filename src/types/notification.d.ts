
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  avatarUrl: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'POST_LIKE'
  | 'POST_COMMENT' 
  | 'POST_SHARE'
  | 'COMMENT_REPLY'
  | 'COMMENT_LIKE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'CLASS_INVITE'
  | 'CLASS_UPDATE'
  | 'COURSE_ASSIGNMENT'
  | 'DEADLINE_REMINDER'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'POST_REACTION'
  | 'COMMENT_REACTION'
  | 'REPLY_REACTION'
  | 'POST_MENTION'
  | 'COMMENT_MENTION'
  | 'USER_FOLLOW';

export interface NotificationData {
  postId?: string;
  commentId?: string;
  userId?: string;
  classId?: string;
  courseId?: string;
  actionId?: string;
  metadata?: Record<string, unknown | string | number | boolean | null | undefined>;
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

export interface NotificationApiFilters {
  page?: number;
  size?: number;
  isRead?: boolean;
  notificationType?: string;
}

export interface CreateNotificationApiRequest {
  receiverId: number;
  senderId?: number | null;
  notificationType: string;
  targetType?: string | null;
  targetId?: number | null;
  title: string;
  content: string;
}

export type TargetType = 'POST' | 'COMMENT' | 'REPLY' | 'USER' | 'CLASS' | 'COURSE';
