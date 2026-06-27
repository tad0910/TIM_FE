import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../fontawesome';
import reactionsApi, { type EmotionType } from '../../services/reactionsApi';
import ReactionBar from '../../modules/dashboard/components/ReactionBar';
import likeIcon from '../../assets/like.svg';
import loveIcon from '../../assets/love.svg';
import hahaIcon from '../../assets/haha.svg';
import wowIcon from '../../assets/wow.svg';
import sadIcon from '../../assets/sad.svg';
import angryIcon from '../../assets/angry.svg';
import type { Post } from '../../types/post';

interface PostActionProps {
  post: Post;
  onCommentClick?: () => void;
  onShareClick?: () => void;
  className?: string;
}

export default function PostAction({
  post,
  onCommentClick,
  onShareClick,
  className = '',
}: PostActionProps) {
  const { user } = useAuthStore();
  const [reactionOfCurrentUser, setReactionOfCurrentUser] = useState<EmotionType | null>(null);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id || !post.reactions) return;
    
    const currentUserReaction = post.reactions.find(
      (r: { userId: string | number }) => String(r.userId) === String(user.id)
    );
    const emotion = currentUserReaction?.emotionType as EmotionType | undefined;
    setReactionOfCurrentUser(emotion ?? null);
  }, [post.reactions, user?.id]);

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
        await reactionsApi.deletePostReaction(post.id, { userId: user.id });
        setReactionOfCurrentUser(null);
      } else {
        await reactionsApi.createOrUpdatePostReaction(post.id, {
          userId: user.id,
          emotionType: emotion,
        });
        setReactionOfCurrentUser(emotion);
      }

      window.dispatchEvent(
        new CustomEvent('reaction-updated', {
          detail: { targetType: 'post', targetId: post.id },
        })
      );
    } catch (err) {
      console.error('Failed to handle reaction:', err);
    } finally {
      setShowReactionBar(false);
    }
  };

  const handleLikeClick = async () => {
    if (!user?.id) return;

    try {
      if (reactionOfCurrentUser) {
        await reactionsApi.deletePostReaction(post.id, { userId: user.id });
        setReactionOfCurrentUser(null);
      } else {
        await reactionsApi.createOrUpdatePostReaction(post.id, {
          userId: user.id,
          emotionType: 'like',
        });
        setReactionOfCurrentUser('like');
      }

      window.dispatchEvent(
        new CustomEvent('reaction-updated', {
          detail: { targetType: 'post', targetId: post.id },
        })
      );
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick();
    }
  };

  const handleShareClick = () => {
    if (onShareClick) {
      onShareClick();
    } else {
      console.log('Share clicked');
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

  return (
    <>
      <div className={`flex justify-between ${className}`}>
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
              className={`transition-colors flex items-center gap-1 ${
                reactionOfCurrentUser ? "font-semibold" : "hover:text-blue-600"
              }`}
            >
              {reactionOfCurrentUser ? (
                <img
                  src={reactionIcons[reactionOfCurrentUser]}
                  alt={reactionOfCurrentUser}
                  width={20}
                  height={20}
                />
              ) : (
                <FontAwesomeIcon icon={["far", "thumbs-up"]} />
              )}

              {reactionOfCurrentUser
                ? reactionOfCurrentUser?.charAt(0).toUpperCase() +
                  reactionOfCurrentUser?.slice(1)
                : "Like"}
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
          onClick={handleCommentClick}
          className="hover:text-blue-600 transition-colors"
        >
          <FontAwesomeIcon icon={["far", "comment"]} /> Comment
        </button>

        <button
          onClick={handleShareClick}
          className="hover:text-blue-600 transition-colors"
        >
          <FontAwesomeIcon icon={["far", "share-from-square"]} /> Share
        </button>
      </div>
    </>
  );
}

