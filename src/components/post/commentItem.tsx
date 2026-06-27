import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../fontawesome';
import { deleteComment, updateComment, createReply } from '../../services/commentsApi';
import type { Comment } from '../../types/post';
import UserAvatarWithModal from '../UserAvatarWithModal';
import { formatRelativeTime } from '../../utils/timeFormat';
import ReactionBar from '../../modules/dashboard/components/ReactionBar';
import reactionsApi, { type EmotionType } from '../../services/reactionsApi';
import likeIcon from '../../assets/like.svg';
import loveIcon from '../../assets/love.svg';
import hahaIcon from '../../assets/haha.svg';
import wowIcon from '../../assets/wow.svg';
import sadIcon from '../../assets/sad.svg';
import angryIcon from '../../assets/angry.svg';
import LinkPreview from '../LinkPreview';
import { getFirstUrl } from '../../utils/linkUtils';

interface CommentItemProps {
  comment: Comment;
  onUpdate?: (updatedComment: Comment) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string, reply: any) => void;
  className?: string;
}

export default function CommentItem({
  comment,
  onUpdate,
  onDelete,
  onReply,
  className = '',
}: CommentItemProps) {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reactionOfCurrentUser, setReactionOfCurrentUser] = useState<EmotionType | null>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);

  const isOwner = user?.id === comment.userId;
  const hasReplies = comment.replyComments && comment.replyComments.length > 0;

  useEffect(() => {
    if (!user?.id || !comment.reactions) return;
    
    const currentUserReaction = comment.reactions.find(
      (r: { userId: string | number }) => String(r.userId) === String(user.id)
    );
    const emotion = currentUserReaction?.emotionType as EmotionType | undefined;
    setReactionOfCurrentUser(emotion ?? null);
  }, [comment.reactions, user?.id]);

  const updateReactionBarPosition = () => {
    const btn = likeButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const barWidth = 220;
    const top = rect.top - 48;
    const left = rect.left + rect.width / 2 - barWidth / 2;
    setPortalPos({ top: Math.max(8, top), left: Math.max(8, left) });
  };

  useEffect(() => {
    if (!showReactionBar) return;
    updateReactionBarPosition();
    const onScrollOrResize = () => updateReactionBarPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showReactionBar]);

  const handleReactionSelect = async (emotion: EmotionType) => {
    if (!user?.id) return;

    try {
      if (reactionOfCurrentUser === emotion) {
        await reactionsApi.deleteCommentReaction(comment.id, { userId: user.id });
        setReactionOfCurrentUser(null);
      } else {
        await reactionsApi.createOrUpdateCommentReaction(comment.id, {
          userId: user.id,
          emotionType: emotion,
        });
        setReactionOfCurrentUser(emotion);
      }

      window.dispatchEvent(
        new CustomEvent('reaction-updated', {
          detail: { targetType: 'comment', targetId: comment.id },
        })
      );
    } catch (err) {
      console.error('Failed to handle comment reaction:', err);
    } finally {
      setShowReactionBar(false);
    }
  };

  const handleLikeClick = async () => {
    if (!user?.id) return;

    try {
      if (reactionOfCurrentUser === 'like') {
        await reactionsApi.deleteCommentReaction(comment.id, { userId: user.id });
        setReactionOfCurrentUser(null);
      } else if (reactionOfCurrentUser) {
        await reactionsApi.createOrUpdateCommentReaction(comment.id, {
          userId: user.id,
          emotionType: 'like',
        });
        setReactionOfCurrentUser('like');
      } else {
        await reactionsApi.createOrUpdateCommentReaction(comment.id, {
          userId: user.id,
          emotionType: 'like',
        });
        setReactionOfCurrentUser('like');
      }

      window.dispatchEvent(
        new CustomEvent('reaction-updated', {
          detail: { targetType: 'comment', targetId: comment.id },
        })
      );
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  const reactionIcons: Record<EmotionType, string> = {
    like: likeIcon,
    love: loveIcon,
    haha: hahaIcon,
    wow: wowIcon,
    sad: sadIcon,
    angry: angryIcon,
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(comment.content);
  };

  const handleSave = async () => {
    if (!user?.id || !editedContent.trim()) return;

    try {
      const updatedComment = await updateComment(comment.id, {
        userId: user.id,
        content: editedContent.trim(),
      });

      if (onUpdate) {
        onUpdate(updatedComment);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(comment.content);
  };

  const handleDelete = async () => {
    if (!user?.id || !window.confirm('Bạn có chắc muốn xóa bình luận này?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteComment(comment.id, user.id);

      if (onDelete) {
        onDelete(comment.id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReply = async () => {
    if (!user?.id || !replyText.trim()) return;

    try {
      const newReply = await createReply(comment.id, {
        userId: user.id,
        content: replyText.trim(),
      });

      if (onReply) {
        onReply(comment.id, newReply);
      }
      
      setIsReplying(false);
      setReplyText('');
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
      if (isEditing) {
        handleSave();
      } else if (isReplying) {
        handleReply();
      }
    }
  };

  if (isDeleting) {
    return (
      <div className={`${className} opacity-50`}>
        <p className="text-sm text-gray-500 italic">Đang xóa...</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${className}`}>
      <UserAvatarWithModal
        src={comment.userAvatar}
        userId={comment.userId}
        authorName={comment.username}
        size="sm"
      />
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm text-gray-900">
              {comment.username || 'Người dùng'}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!editedContent.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Lưu
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const firstUrl = getFirstUrl(comment.content);
                const hasMediaFiles = (comment.mediaFiles && comment.mediaFiles.length > 0) || (comment.files && comment.files.length > 0);
                const hasLink = !!firstUrl && !hasMediaFiles;
                
                if (firstUrl) {
                  console.log('[CommentItem] URL detected:', firstUrl, 'hasMediaFiles:', hasMediaFiles, 'hasLink:', hasLink);
                }
                
                return (
                  <>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {hasLink && firstUrl ? comment.content.replace(firstUrl, '').trim() : comment.content}
                    </p>
                    {hasLink && firstUrl && (
                      <div className="mt-2">
                        <LinkPreview url={firstUrl} size="compact" lazy={false} />
                      </div>
                    )}
                  </>
                );
              })()}

              {(comment.mediaFiles && comment.mediaFiles.length > 0) || (comment.files && comment.files.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {(comment.mediaFiles || comment.files || []).map((file, index) => {
                    const fileUrl = file.fileUrl || (file as any).fileUrl || '';
                    const fileType = (file.fileType || (file as any).fileType || 'IMAGE').toUpperCase();
                    
                    const makeImageUrl = (url: string) => {
                      if (!url) return '';
                      if (url.startsWith('http')) return url;
                      if (url.startsWith('/uploads')) {
                        const base = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8081') as string;
                        return `${base.replace(/\/$/, '')}${url}`;
                      }
                      return url;
                    };
                    
                    const fullUrl = makeImageUrl(fileUrl);
                    
                    return (
                      <div key={index} className="relative">
                        {fileType === 'IMAGE' ? (
                          <img
                            src={fullUrl}
                            alt="Comment attachment"
                            className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-gray-200"
                            onError={(e) => {
                              console.error('Failed to load image:', fullUrl);
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                        ) : fileType === 'VIDEO' ? (
                          <video
                            src={fullUrl}
                            controls
                            className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-200"
                            onError={() => {
                              console.error('Failed to load video:', fullUrl);
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex items-center gap-4 mt-2">
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (hideReactionBarTimeoutRef.current) {
                      clearTimeout(hideReactionBarTimeoutRef.current);
                      hideReactionBarTimeoutRef.current = null;
                    }
                    updateReactionBarPosition();
                    setShowReactionBar(true);
                  }}
                  onMouseLeave={() => {
                    hideReactionBarTimeoutRef.current = window.setTimeout(() => {
                      setShowReactionBar(false);
                      hideReactionBarTimeoutRef.current = null;
                    }, 500);
                  }}
                >
                  <button
                    ref={likeButtonRef}
                    onClick={handleLikeClick}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      reactionOfCurrentUser ? "font-semibold" : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    {reactionOfCurrentUser ? (
                      <img
                        src={reactionIcons[reactionOfCurrentUser]}
                        alt={reactionOfCurrentUser}
                        width={16}
                        height={16}
                      />
                    ) : (
                      <FontAwesomeIcon icon={['far', 'thumbs-up']} />
                    )}
                    <span>{reactionOfCurrentUser ? reactionOfCurrentUser.charAt(0).toUpperCase() + reactionOfCurrentUser.slice(1) : 'Like'}</span>
                  </button>

                  {showReactionBar &&
                    portalPos &&
                    createPortal(
                      <div
                        style={{
                          position: 'fixed',
                          top: portalPos.top,
                          left: portalPos.left,
                          zIndex: 9999,
                        }}
                        onMouseEnter={() => {
                          if (hideReactionBarTimeoutRef.current) {
                            clearTimeout(hideReactionBarTimeoutRef.current);
                            hideReactionBarTimeoutRef.current = null;
                          }
                          setShowReactionBar(true);
                        }}
                        onMouseLeave={() => {
                          hideReactionBarTimeoutRef.current = window.setTimeout(() => {
                            setShowReactionBar(false);
                            hideReactionBarTimeoutRef.current = null;
                          }, 200);
                        }}
                      >
                        <ReactionBar onSelect={handleReactionSelect} />
                      </div>,
                      document.body
                    )}
                </div>

                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <FontAwesomeIcon icon={['far', 'comment-dots']} />
                  <span>Reply</span>
                  {hasReplies && (
                    <span className="text-gray-500">
                      ({comment.replyComments?.length})
                    </span>
                  )}
                </button>

                {isOwner && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={['far', 'pen-to-square']} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      <FontAwesomeIcon icon={['far', 'trash-can']} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {isReplying && (
          <div className="mt-3 ml-4 border-l-2 border-gray-200 pl-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Viết trả lời..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {hasReplies && (
          <div className="ml-4 mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
            {comment.replyComments?.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <UserAvatarWithModal
                  src={reply.userAvatar}
                  userId={reply.userId}
                  authorName={reply.username || 'Người dùng'}
                  size="xs"
                />
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs text-gray-900">
                        {reply.username || 'Người dùng'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(reply.createdAt)}
                      </span>
                    </div>
                    {(() => {
                      const firstUrl = getFirstUrl(reply.content);
                      const hasLink = !!firstUrl;
                      return (
                        <>
                          <p className="text-xs text-gray-800 leading-relaxed">
                            {hasLink ? reply.content.replace(firstUrl, '').trim() : reply.content}
                          </p>
                          {hasLink && firstUrl && (
                            <div className="mt-2">
                              <LinkPreview url={firstUrl} size="compact" lazy={false} />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

