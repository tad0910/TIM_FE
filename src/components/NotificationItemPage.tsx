import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../services/notificationApi';
import { formatNotificationTime } from '../utils/timeFormat';
import { getImageUrl } from '../services/avatar';

interface NotificationItemPageProps {
  notification: NotificationDTO;
  onMarkAsRead?: (notificationId: number) => void;
  className?: string;
}

const NotificationItemPage: React.FC<NotificationItemPageProps> = ({
  notification,
  onMarkAsRead,
  className = ''
}) => {
  const navigate = useNavigate();

  const getNotificationIcon = (notification: NotificationDTO) => {
    const hasValidAvatar =
      notification.senderAvatar &&
      notification.senderAvatar.trim() !== '' &&
      notification.senderAvatar !== 'null' &&
      notification.senderAvatar !== 'undefined';

    if (hasValidAvatar) {
      return (
        <img
          src={getImageUrl(notification.senderAvatar!)}
          alt={notification.senderUsername}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    if (notification.iconUrl && notification.iconUrl.trim() !== '') {
      return (
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          <img
            src={notification.iconUrl}
            alt="Notification icon"
            className="w-12 h-12 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    const type = notification.notificationType.toLowerCase();

    switch (type) {
      case 'post_reaction':
      case 'post_like':
        return (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'post_comment':
      case 'comment_reply':
        return (
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
        );
      case 'grade_new':
      case 'grade_updated':
        return (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        );
      case 'friend_request':
      case 'friend_accepted':
        return (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        );
      case 'system_announcement':
        return (
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.446-3.278 7.446-7.308 0-4.03-3.345-7.308-7.446-7.308H7a3.998 3.998 0 00-3.436 5.683l.872 2.5z"
              />
            </svg>
          </div>
        );
      case 'gamification_point_earned':
      case 'gamification_achievement_unlocked':
        return (
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <img
              src="/icon-diem-so.png"
              alt="Điểm số"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        );
      case 'tuition_overdue':
      case 'tuition_payment_overdue':
        return (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead && notification.id) {
      Promise.resolve(onMarkAsRead(notification.id)).catch((err: unknown) => {
        console.error('Error marking notification as read:', err);
      });
    }
    
    const notificationType = notification.notificationType.toLowerCase();
    if (notificationType === 'grade_new' || notificationType === 'grade_updated') {
      let classModuleId: string | null = null;
      if (notification.actionUrl) {
        const match = notification.actionUrl.match(/class-modules\/(\d+)/);
        if (match) {
          classModuleId = match[1];
        }
      }
      if (!classModuleId && notification.targetId) {
        classModuleId = String(notification.targetId);
      }
      
      let componentName: string | null = null;
      if (notification.content) {
        const componentMatch = notification.content.match(/\[ ([^\]]+) \]/);
        if (componentMatch && componentMatch[1]) {
          componentName = componentMatch[1].trim();
        }
      }
      
      const params = new URLSearchParams();
      if (classModuleId) {
        params.set('classModuleId', classModuleId);
      }
      if (componentName) {
        params.set('component', componentName);
      }
      navigate(`/scores?${params.toString()}`);
      return;
    }
    
    if (notification.actionUrl) {
      const lowerType = notification.notificationType.toLowerCase();
      if (lowerType === 'late_attendance_opened' || lowerType === 'attendance_reminder_late') {
        navigate('/attendance-management');
        return;
      }

      let fixedUrl = notification.actionUrl;
      
      if (fixedUrl.includes('class-modules') && fixedUrl.includes('my-grades')) {
        return;
      }
      
      fixedUrl = fixedUrl.replace('/posts/', '/post/');
      fixedUrl = fixedUrl.replace('posts/', 'post/');
      
      navigate(fixedUrl);
    } else if (notification.targetType && notification.targetId) {
      const lowerType = notification.notificationType.toLowerCase();
      if (lowerType === 'late_attendance_opened' || lowerType === 'attendance_reminder_late') {
        navigate('/attendance-management');
        return;
      }

      switch (notification.targetType.toLowerCase()) {
        case 'post':
          navigate(`/post/${notification.targetId}`);
          break;
        case 'comment':
          navigate(`/post/${notification.targetId}`);
          break;
        case 'user':
          navigate(`/users/${notification.targetId}`);
          break;
        case 'course':
          navigate(`/course-detail/${notification.targetId}`);
          break;
        default:
          navigate('/');
      }
    } else {
      const lowerType = notification.notificationType.toLowerCase();
      if (lowerType === 'late_attendance_opened' || lowerType === 'attendance_reminder_late') {
        navigate('/attendance-management');
        return;
      }

      switch (notification.notificationType.toLowerCase()) {
        case 'post_like':
        case 'post_comment':
        case 'post_share':
        case 'post_reaction':
          navigate('/post');
          break;
        case 'friend_request':
        case 'friend_accepted':
        case 'user_follow':
          navigate('/profile');
          break;
        default:
          navigate('/');
      }
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead && onMarkAsRead && notification.id) {
      Promise.resolve(onMarkAsRead(notification.id)).catch((err: unknown) => {
        console.error('Error marking notification as read:', err);
      });
    }
  };

  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-blue-50' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                !notification.isRead ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {notification.title}
              </h4>
              
              <p className="text-xs text-gray-500 mt-1">
                từ {notification.senderUsername}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 ml-2">
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
              
              {!notification.isRead && onMarkAsRead && (
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  title="Đánh dấu đã đọc"
                >
                </button>
              )}
            </div>
          </div>
          
          <p className={`text-sm mt-2 ${
            !notification.isRead ? 'text-gray-800' : 'text-gray-600'
          }`}>
            {notification.content}
          </p>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {formatNotificationTime(notification.createdAt)}
              </span>
              
              {notification.isRead && notification.readAt && (
                <span className="text-xs text-gray-400">
                  • Đã đọc {formatNotificationTime(notification.readAt)}
                </span>
              )}
            </div>
          </div>
          
            <div className="mt-2">
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItemPage;
