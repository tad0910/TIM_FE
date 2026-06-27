import { useState, useEffect, useCallback } from 'react';
import { getCommentsByPost } from '../../services/commentsApi';
import type { Comment } from '../../types/post';
import CommentInput from './commentInput';
import CommentList from './commentList';
import postImage from '../../assets/post.png';

interface CommentSectionProps {
  postId: string;
  className?: string;
  onCountChange?: (nextCount: number) => void;
}

export default function CommentSection({ postId, className = '', onCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await getCommentsByPost(postId);
      const list = commentsData || [];
      setComments(list);
      if (onCountChange) onCountChange(list.length);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = useCallback((comment: Comment) => {
    console.log('handleNewComment called with:', comment);
    setComments((prev) => {
      if (prev.some(c => c.id === comment.id)) {
        console.log('Comment already exists, skipping');
        return prev;
      }
      const next = [...prev, comment];
      console.log('Adding comment, new count:', next.length);
      if (onCountChange) onCountChange(next.length);
      return next;
    });
    setExpandAll(true);
  }, [onCountChange]);

  const handleCommentUpdate = (updatedComment: Comment) => {
    setComments((prev) =>
      prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
    );
  };

  const handleCommentDelete = (commentId: string) => {
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      if (onCountChange) onCountChange(next.length);
      return next;
    });
  };

  const handleReply = (commentId: string, reply: any) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, replyComments: [...(c.replyComments || []), reply] }
          : c
      )
    );
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setExpandAll(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          aria-label="Xem tất cả bình luận"
        >
          {/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M7.5 8.25h9m-9 3.75h6m-9.75 6.75a.75.75 0 01-1.28-.53V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25v9a2.25 2.25 0 01-2.25 2.25H8.309a.75.75 0 00-.53.22l-3.29 3.29z" />
          </svg>
          <span className="text-sm font-medium">{comments.length}</span> */}
        </button>
      </div>

      {comments.length > 0 ? (
        <div className="mb-6">
          <CommentList
            comments={comments}
            onCommentUpdate={handleCommentUpdate}
            onCommentDelete={handleCommentDelete}
            onReply={handleReply}
            initialVisibleCount={expandAll ? comments.length : 3}
            className=""
            key={expandAll ? 'all' : 'partial'}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <img src={postImage} alt="No comments" className="w-24 h-24 mb-4 opacity-70" />
          <p className="text-gray-600 text-center">
            Chưa có bình luận nào
          </p>
          <p className="text-gray-500 text-sm text-center">
            Hãy là người bình luận đầu tiên
          </p>
        </div>
      )}

      <CommentInput
        postId={postId}
        onCommentAdded={handleNewComment}
      />
    </div>
  );
}

