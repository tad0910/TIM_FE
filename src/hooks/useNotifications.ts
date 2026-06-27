import { useState, useCallback } from 'react';
import { notificationApi, type NotificationDTO } from '../services/notificationApi';

interface UseNotificationsReturn {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  currentPage: number;
  activeFilter: 'all' | 'unread' | 'read';
  loadNotifications: (page?: number, filter?: 'all' | 'unread' | 'read', append?: boolean) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  handleFilterChange: (filter: 'all' | 'unread' | 'read') => void;
  handleMarkAsRead: (notificationId: number) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (userId: number): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');

  const PAGE_SIZE = 20;

  const loadNotifications = useCallback(async (
    page: number = 0, 
    filter: 'all' | 'unread' | 'read' = activeFilter, 
    append: boolean = false
  ) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let response;
      
      switch (filter) {
        case 'unread':
          if (page === 0) {
            const unreadNotifications = await notificationApi.getUnreadNotifications(userId);
            response = {
              content: unreadNotifications,
              totalElements: unreadNotifications.length,
              totalPages: 1,
              size: unreadNotifications.length,
              number: 0,
              first: true,
              last: true,
              numberOfElements: unreadNotifications.length
            };
          } else {
            response = {
              content: [],
              totalElements: 0,
              totalPages: 0,
              size: 0,
              number: page,
              first: false,
              last: true,
              numberOfElements: 0
            };
          }
          break;
        case 'read':
          response = await notificationApi.getReadNotifications(userId, { page, size: PAGE_SIZE });
          break;
        case 'all':
        default:
          response = await notificationApi.getNotificationsByUserId(userId, { page, size: PAGE_SIZE });
          break;
      }

      if (append) {
        setNotifications(prev => [...prev, ...response.content]);
      } else {
        setNotifications(response.content);
      }
      
      setHasMore(!response.last);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeFilter, loading]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadNotificationCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [userId]);

  const handleFilterChange = useCallback((filter: 'all' | 'unread' | 'read') => {
    setActiveFilter(filter);
    setCurrentPage(0);
    setHasMore(true);
    loadNotifications(0, filter, false);
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId, userId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [userId]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead(userId);
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          isRead: true, 
          readAt: new Date().toISOString() 
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId]);

  const refreshNotifications = useCallback(async () => {
    setCurrentPage(0);
    setHasMore(true);
    await Promise.all([
      loadNotifications(0, activeFilter, false),
      loadUnreadCount()
    ]);
  }, [loadNotifications, loadUnreadCount, activeFilter]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    currentPage,
    activeFilter,
    loadNotifications,
    loadUnreadCount,
    handleFilterChange,
    handleMarkAsRead,
    handleMarkAllAsRead,
    refreshNotifications
  };
};
