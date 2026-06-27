import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../fontawesome';
import UserAvatarWithModal from '../UserAvatarWithModal';

interface PostHeaderProps {
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
  createdAt: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
}

export default function PostHeader({
  authorName = 'Người dùng',
  authorAvatar,
  authorId,
  createdAt,
  onEdit,
  onDelete,
  onViewDetails,
}: PostHeaderProps) {
  const { user } = useAuthStore();
  const [showActions, setShowActions] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = user?.id === authorId;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActions && actionsButtonRef.current) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowActions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 0) return 'Trong tương lai';
    if (diffInSeconds < 60) return 'Vừa xong';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} tuần trước`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} năm trước`;
  };


  return (
    <div className="mb-6">
      {/* Post Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatarWithModal
            src={authorAvatar}
            userId={authorId}
            authorName={authorName}
            size="md"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {authorName}
            </h3>
            <p className="text-sm text-gray-500">
              {formatTimeAgo(createdAt)}
            </p>
          </div>
        </div>

        {/* Three-dot menu button */}
        {isOwner && (
          <div className="relative">
            <button
              ref={actionsButtonRef}
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Menu"
            >
              <FontAwesomeIcon icon={['fas', 'ellipsis-vertical']} />
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['far', 'pen-to-square']} />
                    Chỉnh sửa
                  </button>
                )}
                {onViewDetails && (
                  <button
                    onClick={() => {
                      onViewDetails();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['far', 'eye']} />
                    Xem chi tiết
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fas', 'trash']} />
                    Xóa bài viết
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

