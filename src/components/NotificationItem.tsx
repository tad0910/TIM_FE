import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../services/notificationApi';
import { formatNotificationTime } from '../utils/timeFormat';
import { getImageUrl } from '../services/avatar';

interface NotificationItemProps {
  notification: NotificationDTO;
  onMarkAsRead?: (notificationId: number) => void;
  onClick?: (notification: NotificationDTO) => void;
  className?: string;
}

const extractGradeDetails = (content?: string | null) => {
  if (!content) {
    return {};
  }

  const bracketMatches = [...content.matchAll(/\[\s*([^\]]+)\s*\]/g)];
  const component = bracketMatches[0]?.[1]?.trim();
  const moduleName = bracketMatches[1]?.[1]?.trim();
  const scoreMatch = content.match(/:\s*([0-9]+(?:[.,][0-9]+)?)/);
  const score = scoreMatch?.[1]?.trim();

  return { component, moduleName, score };
};

const buildGradeNotificationMessage = (
  notificationType: string,
  details: ReturnType<typeof extractGradeDetails>,
  fallback?: string | null,
) => {
  const normalizedType = notificationType.toLowerCase();
  const isNew = normalizedType === 'grade_new';
  const baseText = isNew
    ? 'Bạn vừa được ghi nhận điểm mới'
    : 'Điểm của bạn vừa được cập nhật';

  const parts: string[] = [];
  if (details.component) {
    parts.push(`[ ${details.component} ]`);
  }
  if (details.moduleName) {
    parts.push(`môn [ ${details.moduleName} ]`);
  }

  const detailText = parts.length > 0 ? ` ${parts.join(' ')}` : '';
  const scoreText = details.score ? `: ${details.score}` : '';

  const message = `${baseText}${detailText}${scoreText}`.trim();
  return message || fallback || 'Bạn có điểm mới';
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClick,
  className = ''
}) => {
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);
  const normalizedType = (notification.notificationType || '').toLowerCase();
  
  useEffect(() => {
    console.log('[NotificationItem] Notification updated:', notification.id, 'isRead:', notification.isRead, 'title:', notification.title?.substring(0, 30));
  }, [notification.id, notification.isRead, notification.title]);
  const gradeDetails = useMemo(
    () => extractGradeDetails(notification.content || notification.title),
    [notification.content, notification.title],
  );
  const displayContent = useMemo(() => {
    if (normalizedType === 'grade_new' || normalizedType === 'grade_updated') {
      return buildGradeNotificationMessage(
        normalizedType,
        gradeDetails,
        notification.content || notification.title,
      );
    }
    return notification.content || notification.title || 'Bạn có thông báo mới';
  }, [normalizedType, gradeDetails, notification.content, notification.title]);
  
  const hasValidAvatar = notification.senderAvatar && 
    notification.senderAvatar.trim() !== '' && 
    notification.senderAvatar !== 'null' && 
    notification.senderAvatar !== 'undefined';
  
  useEffect(() => {
    setAvatarError(false);
  }, [notification.id, notification.senderAvatar]);

  const getNotificationIcon = (type: string, customIconUrl?: string | null) => {
    if (customIconUrl && customIconUrl.trim() !== '') {
      return (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          <img
            src={customIconUrl}
            alt="Notification icon"
            className="w-8 h-8 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }
    const t = type.toLowerCase();
    switch (t) {
      case 'post_like':
      case 'post_reaction':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'post_comment':
      case 'comment_reply':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'grade_new':
      case 'grade_updated':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        );
      case 'friend_request':
      case 'friend_accepted':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case 'system_announcement':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.446-3.278 7.446-7.308 0-4.03-3.345-7.308-7.446-7.308H7a3.998 3.998 0 00-3.436 5.683l.872 2.5z" />
            </svg>
          </div>
        );
      case 'gamification_point_earned':
      case 'gamification_achievement_unlocked':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <img 
              src="/icon-diem-so.png" 
              alt="Điểm số" 
              className="w-5 h-5 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  `;
                }
              }}
            />
          </div>
        );
      case 'tuition_overdue':
      case 'tuition_payment_overdue':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead && notification.id) {
      console.log('[NotificationItem] Marking notification as read:', notification.id, notification.title);
      Promise.resolve(onMarkAsRead(notification.id))
        .then(() => {
          console.log('[NotificationItem] Successfully marked as read:', notification.id);
        })
        .catch((err: unknown) => {
          console.error('[NotificationItem] Error marking notification as read:', err);
        });
    }
    
    const notificationType = normalizedType;
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
      
      const params = new URLSearchParams();
      params.set('view', 'list');
      if (classModuleId) {
        params.set('classModuleId', classModuleId);
      }
      if (gradeDetails.component) {
        params.set('component', gradeDetails.component);
      }
      navigate(`/scores?${params.toString()}`);
      
      if (onClick) {
        onClick(notification);
      }
      return;
    }

    if (notificationType.startsWith('tuition') || notificationType.includes('tuition')) {
      navigate('/tuition');
      if (onClick) {
        onClick(notification);
      }
      return;
    }
    
    if (notification.actionUrl) {
      console.log('Original actionUrl:', notification.actionUrl);
      let fixedUrl = notification.actionUrl;
      
      if (fixedUrl.includes('class-modules') && fixedUrl.includes('my-grades')) {
        if (onClick) {
          onClick(notification);
        }
        return;
      }
      
      fixedUrl = fixedUrl.replace('/posts/', '/post/');
      fixedUrl = fixedUrl.replace('posts/', 'post/');
      
      console.log('Fixed URL:', fixedUrl);
      navigate(fixedUrl);
    } else if (notification.targetType && notification.targetId) {
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
    
    if (onClick) {
      onClick(notification);
    }
  };


  return (
    <div
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {hasValidAvatar && !avatarError ? (
            <img
              src={getImageUrl(notification.senderAvatar)}
              alt={notification.senderUsername}
              className="w-8 h-8 rounded-full object-cover"
              onError={() => {
                setAvatarError(true);
              }}
            />
          ) : notification.iconUrl && notification.iconUrl.trim() !== '' ? (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={notification.iconUrl}
                alt="Notification icon"
                className="w-8 h-8 object-cover"
                onError={() => {
                }}
              />
            </div>
          ) : (
            getNotificationIcon(notification.notificationType, notification.iconUrl)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                !notification.isRead ? 'text-gray-900' : 'text-gray-800'
              }`}>
                {notification.title || displayContent}
              </p>
              {notification.content && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {notification.content}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-xs text-gray-500">
                {formatNotificationTime(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
