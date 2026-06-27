import React, { useEffect, useRef, useState } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import NotificationMenu from './NotificationMenu';

interface NotificationListProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (notificationId: number) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  isOpen,
  onClose,
  onMarkAsRead
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  } = useNotificationContext();
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [filteredNotifications, setFilteredNotifications] = useState(notifications);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[NotificationList] Notifications changed, updating filtered list. Total:', notifications.length, 'Unread:', notifications.filter(n => !n.isRead).length);
    switch (activeFilter) {
      case 'unread':
        setFilteredNotifications(notifications.filter(n => !n.isRead));
        break;
      case 'read':
        setFilteredNotifications(notifications.filter(n => n.isRead));
        break;
      case 'all':
      default:
        setFilteredNotifications(notifications);
        break;
    }
  }, [notifications, activeFilter]);

  const handleFilterChange = (filter: 'all' | 'unread' | 'read') => {
    setActiveFilter(filter);
  };

  const handleMarkAsReadWithCallback = async (notificationId: number) => {
    await markAsRead(notificationId);
    onMarkAsRead?.(notificationId);
  };

  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          refreshNotifications();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, loading, refreshNotifications]);

  useEffect(() => {
    if (isOpen) {
      refreshNotifications(true);
    }
  }, [isOpen, refreshNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
          <div className="flex items-center space-x-2">
            {/*{unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}*/}
            <NotificationMenu />
          </div>
        </div>
        
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => handleFilterChange('unread')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'unread'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button
            onClick={() => handleFilterChange('read')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'read'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Đã đọc
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-80">
        {filteredNotifications.length === 0 && !loading ? (
          <div className="p-4 text-center text-gray-500">
            {activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 
             activeFilter === 'read' ? 'Không có thông báo đã đọc' : 
             'Không có thông báo nào'}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsReadWithCallback}
              onClick={(notification) => {
                console.log('Notification clicked:', notification);
              }}
            />
          ))
        )}

        {loading && (
          <div ref={loadingRef} className="p-4 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Đang tải...</span>
            </div>
          </div>
        )}

        {!loading && !hasMore && filteredNotifications.length > 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Đã hiển thị tất cả thông báo
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
