import React, { useState } from 'react';
import NotificationList from './NotificationList';
import { useNotificationContext } from '../contexts/NotificationContext';

interface NotificationBellProps {
  userId: number;
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, markAsRead } = useNotificationContext();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon */}
      <button 
        onClick={handleToggle}
        className="text-white hover:text-blue-200 transition-all duration-200 p-2 rounded-full hover:bg-white/10 relative"
        aria-label="Thông báo"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <NotificationList
        isOpen={isOpen}
        onClose={handleClose}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
};

export default NotificationBell;
