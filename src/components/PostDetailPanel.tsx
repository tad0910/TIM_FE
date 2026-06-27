import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontawesome';
import UserAvatarWithModal from './UserAvatarWithModal';
import PostContentTextOnly from './PostContentTextOnly';
import PostAction from './post/postAction';
import CommentSection from './post/commentSection';
import ReactionCounts from '../modules/dashboard/components/ReactionCounts';
import { getCommentsByPost } from '../services/commentsApi';
import type { Post } from '../types/post';

interface PostDetailPanelProps {
  post: Post;
  onEdit: () => void;
  onDelete: () => void;
  onCommentClick: () => void;
  onShareClick: () => void;
  onOpenReactionsModal?: () => void;
}

export default function PostDetailPanel({
  post,
  onEdit,
  onDelete,
  onCommentClick,
  onShareClick,
  onOpenReactionsModal,
}: PostDetailPanelProps) {
  const { user } = useAuthStore();
  const [showActions, setShowActions] = useState(false);
  const actionsButtonRef = React.useRef<HTMLButtonElement>(null);
  const [commentCount, setCommentCount] = useState<number>(0);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getCommentsByPost(post.id);
        setCommentCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setCommentCount(0);
      }
    })();
  }, [post.id]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: 'post'; targetId: string };
      if (detail && detail.targetType === 'post' && detail.targetId === post.id) {
        setCommentCount((c) => c + 1);
      }
    };
    window.addEventListener('comment-updated', handler as EventListener);
    return () => window.removeEventListener('comment-updated', handler as EventListener);
  }, [post.id]);

  const isOwner = user?.id === post.author?.id;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
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
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="p-4 lg:p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatarWithModal
              src={post.author?.avatar}
              userId={post.author?.id}
              authorName={post.author?.name}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.author?.name || 'Người dùng'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatTimeAgo(post.createdAt)}</span>
                <FontAwesomeIcon icon={['fas', 'globe']} className="text-xs" />
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="relative flex-shrink-0 ml-2">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">
          <PostContentTextOnly post={post} />
        </div>

        <div className="px-2 lg:px-6 pb-2">
          <div className="flex items-center justify-between">
            <ReactionCounts
              postId={post.id}
              onOpenReactionsModal={onOpenReactionsModal}
              className="px-0 py-0"
            />
            <button
              onClick={onCommentClick}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              aria-label="Xem tất cả bình luận"
            >
              <FontAwesomeIcon icon={["far", "comment"]} className="text-base" />
              <span className="text-base font-medium">{commentCount}</span>
            </button>
          </div>
        </div>

        <div className="border-t px-4 lg:px-6 py-3">
          <PostAction
            post={post}
            onCommentClick={onCommentClick}
            onShareClick={onShareClick}
          />
        </div>

        <div className="border-t">
          <CommentSection 
            postId={post.id} 
            className="px-2 lg:px-6 py-4"
            onCountChange={setCommentCount}
          />
        </div>
      </div>
    </div>
  );
}
