import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { notificationApi, type NotificationDTO } from '../services/notificationApi';
import { formatNotificationTime } from '../utils/timeFormat';
import NotificationItemPage from '../components/NotificationItemPage';

const NotificationPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  } = useNotificationContext();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationDTO[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  
  useEffect(() => {
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

  useEffect(() => {
    setAllCount(notifications.length);
    setReadCount(notifications.filter(n => n.isRead).length);
  }, [notifications]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleFilterChange = (filter: 'all' | 'unread' | 'read') => {
    setActiveFilter(filter);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả
                {allCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {allCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleFilterChange('unread')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Chưa đọc
                {unreadCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleFilterChange('read')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === 'read'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Đã đọc
                {readCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {readCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Đang tải thông báo...</span>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 
                 activeFilter === 'read' ? 'Không có thông báo đã đọc' : 
                 'Không có thông báo nào'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItemPage
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
