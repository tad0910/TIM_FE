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

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`text-gray-700 hover:text-blue-600 transition-all duration-200 p-2 rounded-full hover:bg-gray-100 relative ${isOpen ? 'bg-blue-50 text-blue-600' : ''}`}
        aria-label="Thông báo"
      >
        <svg className="w-6 h-6" fill="currentColor" stroke="none" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <NotificationList
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMarkAsRead={async (id) => await markAsRead(id)}
      />
    </div>
  );
};

export default NotificationBell;
