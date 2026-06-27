import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { notificationApi, type NotificationDTO } from '../services/notificationApi';
import { useAuthStore } from '../store/useAuthStore';
import createSSEClient from '../utils/sseClient';

interface NotificationContextType {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  refreshNotifications: (reset?: boolean) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationDTO) => void;
  removeNotification: (notificationId: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sseClientRef = useRef<ReturnType<typeof createSSEClient<NotificationDTO>> | null>(null);
  const pageRef = useRef(0);
  const pageSizeRef = useRef(20);
  const isInitializedRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);
  const storedAchievementNotifications: NotificationDTO[] = [];
  
  const { user, isAuthenticated } = useAuthStore();

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationApi.getUnreadNotificationCount(parseInt(user.id));
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error refreshing unread count:', err);
      if (!(err instanceof Error && err.message.includes('Failed to fetch'))) {
        setError('Không thể tải số lượng thông báo chưa đọc');
      }
    }
  }, [user?.id, isAuthenticated]);

  const refreshNotifications = useCallback(async (reset = false) => {
    if (!user?.id || !isAuthenticated) {
      setNotifications([]);
      setHasMore(false);
      pageRef.current = 0;
      return;
    }

    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const pageToLoad = reset ? 0 : pageRef.current;
      const response = await notificationApi.getNotificationsByUserId(parseInt(user.id), {
        page: pageToLoad,
        size: pageSizeRef.current
      });
      
      const apiNotifications = response.content || [];
      const apiIds = new Set(apiNotifications.map(n => n.id));
      
      const additionalAchievementNotifications = storedAchievementNotifications.filter(
        n => !apiIds.has(n.id)
      );
      
      setNotifications(prev => {
        const baseList = reset ? [] : prev;
        const merged = [...baseList, ...apiNotifications, ...additionalAchievementNotifications];
        const uniqueMap = new Map<number, NotificationDTO>();

        merged.forEach(n => {
          const existing = uniqueMap.get(n.id);
          if (!existing) {
            uniqueMap.set(n.id, n);
          } else {
            const existingIsFromApi = apiIds.has(existing.id);
            const newIsFromApi = apiIds.has(n.id);
            if (newIsFromApi || (!existingIsFromApi && newIsFromApi)) {
              uniqueMap.set(n.id, n);
            }
          }
        });

        return Array.from(uniqueMap.values()).sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      });
      pageRef.current = (response.number ?? pageToLoad) + 1;
      setHasMore(!response.last);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error refreshing notifications:', err);
      if (!(err instanceof Error && err.message.includes('Failed to fetch'))) {
        setError('Không thể tải danh sách thông báo');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!user?.id || !notificationId) {
      console.error('Cannot mark as read: missing user ID or notification ID', { userId: user?.id, notificationId });
      return;
    }

    try {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      await notificationApi.markAsRead(notificationId, parseInt(user.id));
      
      try {
        const count = await notificationApi.getUnreadNotificationCount(parseInt(user.id));
        setUnreadCount(count);
      } catch (refreshErr) {
        console.error('Error refreshing unread count after mark as read:', refreshErr);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: false, readAt: null }
            : notif
        )
      );
      setUnreadCount(prev => prev + 1);
      setError('Không thể đánh dấu thông báo đã đọc');
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await notificationApi.markAllAsRead(parseInt(user.id));
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          isRead: true, 
          readAt: new Date().toISOString() 
        }))
      );
      try {
        const count = await notificationApi.getUnreadNotificationCount(parseInt(user.id));
        setUnreadCount(count);
      } catch (e) {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Không thể đánh dấu tất cả thông báo đã đọc');
    }
  }, [user?.id]);

  const addNotification = useCallback((notification: NotificationDTO) => {
    setNotifications(prev => {
      const existingIndex = prev.findIndex(n => n.id === notification.id);
      const isNew = existingIndex === -1;
      let updated: NotificationDTO[];

      if (!isNew) {
        updated = prev.map((n, index) => {
          if (index !== existingIndex) return n;
          if (n.isRead && !notification.isRead) {
            return n;
          }
          return notification;
        });
      } else {
        updated = [notification, ...prev];

        if (!notification.isRead) {
          setUnreadCount(prevUnread => prevUnread + 1);
        }
      }
      
      return updated;
    });
    
  }, [user?.id]);

  const removeNotification = useCallback((notificationId: number) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (user?.id && isAuthenticated) {
      const shouldInitialize = !isInitializedRef.current || sseClientRef.current === null;

      if (shouldInitialize) {
        isInitializedRef.current = true;

        refreshTimeoutRef.current = setTimeout(() => {
          refreshUnreadCount().catch(() => {
          });
          refreshNotifications(true).catch(() => {
          });
        }, 100);
        const client = createSSEClient<NotificationDTO>({
          path: '/notifications/subscribe',
          token: localStorage.getItem('auth_token'),
          params: { userId: user.id },
          onOpen: () => {
            if (isInitializedRef.current) {
              refreshUnreadCount().catch(() => {
              });
            }
          },
          onMessage: (payload) => {
            const notification = payload as NotificationDTO;
            if (notification && notification.id) {
              console.log('[SSE] NOTIFICATION event received', {
                id: notification.id,
                type: notification.notificationType,
                targetType: notification.targetType,
                targetId: notification.targetId,
              });
            }
            if (notification && typeof notification === 'object' && 'id' in notification && notification.id) {
              addNotification(notification);

              const type = (notification.notificationType || '').toUpperCase();
              const targetType = (notification.targetType || '').toUpperCase();
              const targetId = String(notification.targetId ?? '');

              if (type === 'BLOG_NEW') {
                window.dispatchEvent(new CustomEvent('blog-news-notification', { detail: notification }));
              }

              if (type === 'POST_REACTION' && targetType === 'POST' && targetId) {
                window.dispatchEvent(new CustomEvent('reaction-updated', { detail: { targetType: 'post', targetId } }));
              }

              if (type === 'POST_COMMENT' && targetType === 'POST' && targetId) {
                window.dispatchEvent(new CustomEvent('comment-updated', { detail: { targetType: 'post', targetId } }));
              }

            }
          },
          onError: (error) => {
            if (error && !(error instanceof Error && error.name === 'AbortError')) {
              console.error('[SSE] Connection error:', error);
            }
          },
        });

        sseClientRef.current = client;
        client.connect();
      }

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
        if (sseClientRef.current && (!user?.id || !isAuthenticated)) {
          sseClientRef.current.close();
          sseClientRef.current = null;
          isInitializedRef.current = false;
        }
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      isInitializedRef.current = false;

      if (sseClientRef.current) {
        sseClientRef.current.close();
        sseClientRef.current = null;
      }
    }
  }, [user?.id, isAuthenticated, refreshUnreadCount, refreshNotifications, addNotification]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    hasMore,
    error,
    refreshNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

