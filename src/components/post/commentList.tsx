import { useState } from 'react';
import type { Comment } from '../../types/post';
import CommentItem from './commentItem';

interface CommentListProps {
  comments: Comment[];
  onCommentUpdate?: (updatedComment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  onReply?: (commentId: string, reply: any) => void;
  initialVisibleCount?: number;
  className?: string;
}

export default function CommentList({
  comments,
  onCommentUpdate,
  onCommentDelete,
  onReply,
  initialVisibleCount = 3,
  className = '',
}: CommentListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!comments || comments.length === 0) {
    return null;
  }

  const visibleComments = showAll
    ? comments
    : comments.slice(0, initialVisibleCount);
  const hasMore = comments.length > initialVisibleCount;

  return (
    <div className={`${className}`}>
      {/* Visible Comments */}
      <div className="space-y-4">
        {visibleComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onUpdate={onCommentUpdate}
            onDelete={onCommentDelete}
            onReply={onReply}
          />
        ))}
      </div>

      {hasMore && !showAll && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            Xem thêm {comments.length - initialVisibleCount} bình luận
          </button>
        </div>
      )}

      {/* Show Less Button */}
      {hasMore && showAll && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(false)}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
          >
            Thu gọn
          </button>
        </div>
      )}
    </div>
  );
}

