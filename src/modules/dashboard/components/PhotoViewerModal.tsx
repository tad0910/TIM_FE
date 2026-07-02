import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPostById } from '../../../services/postApi';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Post } from '../../../types/post';
import UserAvatarWithModal from '../../../components/UserAvatarWithModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../../fontawesome';
import ReactionBar from './ReactionBar';
import reactionsApi, { type EmotionType } from '../../../services/reactionsApi';
import ReactionCounts from './ReactionCounts';
import CommentsModal from './CommentsModal';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';

interface PhotoViewerModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  initialMediaIndex?: number;
}

export default function PhotoViewerModal({ 
  post, 
  isOpen, 
  onClose,
  initialMediaIndex = 0
}: PhotoViewerModalProps) {
  const { user } = useAuthStore();
  const [detailedPost, setDetailedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const showReactionBarTimeoutRef = useRef<number | null>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);


  const [currentMediaIndex, setCurrentMediaIndex] = useState(initialMediaIndex);
  const queryClient = useQueryClient();
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    return () => {
      if (showReactionBarTimeoutRef.current) clearTimeout(showReactionBarTimeoutRef.current);
      if (hideReactionBarTimeoutRef.current) clearTimeout(hideReactionBarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: 'post'; targetId: string; action?: 'add' | 'delete' };
      if (detail && detail.targetType === 'post' && detail.targetId === post.id) {
        if (detail.action === 'delete') {
          setCommentCount((c) => Math.max(0, c - 1));
        } else {
          setCommentCount((c) => c + 1);
        }
      }
    };
    window.addEventListener('comment-updated', handler as EventListener);
    return () => window.removeEventListener('comment-updated', handler as EventListener);
  }, [post.id]);

  const showReactionBarHandler = () => {
    if (hideReactionBarTimeoutRef.current) clearTimeout(hideReactionBarTimeoutRef.current);
    showReactionBarTimeoutRef.current = window.setTimeout(() => {
      setShowReactionBar(true);
    }, 500);
  };

  const hideReactionBarHandler = () => {
    if (showReactionBarTimeoutRef.current) clearTimeout(showReactionBarTimeoutRef.current);
    hideReactionBarTimeoutRef.current = window.setTimeout(() => {
      setShowReactionBar(false);
    }, 250);
  };

  const loadDetailedPost = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      const postData = await getPostById(post.id);
      setDetailedPost(postData);
      setCommentCount(postData.totalComments || postData.comments?.length || 0);
    } catch (err) {
      console.error('Error loading detailed post:', err);
      setError('Không thể tải thông tin chi tiết bài viết');
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [post.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadDetailedPost();
      setCurrentMediaIndex(initialMediaIndex);
    }
  }, [isOpen, user?.id, loadDetailedPost, initialMediaIndex]);

  const handleReactionSelect = async (emotion: EmotionType) => {
    if (!user?.id || !detailedPost) return;

    try {
      const reactions = await reactionsApi.getReactionsByPostId(detailedPost.id);
      const userReaction = reactions.find(r => String(r.userId) === String(user.id));
      
      if (userReaction && userReaction.emotionType === emotion) {
        await reactionsApi.deletePostReaction(detailedPost.id, { userId: user.id });
      } else {
        await reactionsApi.createOrUpdatePostReaction(detailedPost.id, { userId: user.id, emotionType: emotion });
      }
      
      await loadDetailedPost(true);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      window.dispatchEvent(
        new CustomEvent("reaction-updated", {
          detail: { targetType: "post", targetId: detailedPost.id },
        })
      );
    } catch (err) {
      console.error('Error reacting to post:', err);
    } finally {
      setShowReactionBar(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric'
    });
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case 'open': return 'Công khai';
      case 'friends': return 'Bạn bè';
      case 'only_me': return 'Chỉ mình tôi';
      default: return 'Công khai';
    }
  };

  const getCurrentUserReaction = () => {
    if (!detailedPost?.reactions || !user?.id) return null;
    return detailedPost.reactions.find(r => String(r.userId) === String(user.id))?.emotionType;
  };

  const getReactionLabel = (emotion?: string | null) => {
    switch (emotion) {
      case 'like': return 'Thích';
      case 'love': return 'Yêu thích';
      case 'haha': return 'Haha';
      case 'wow': return 'Wow';
      case 'sad': return 'Buồn';
      case 'angry': return 'Phẫn nộ';
      default: return 'Thích';
    }
  };

  const getMediaFiles = () => {
    if (!detailedPost) return [];
    const legacyImages = detailedPost.images || (detailedPost.image ? [detailedPost.image] : []);
    const legacyVideos = detailedPost.videos || (detailedPost.video ? [detailedPost.video] : []);
    
    return [
      ...legacyImages.map((url, index) => ({ id: `img-${index}`, fileUrl: url, fileType: 'IMAGE' })),
      ...legacyVideos.map((url, index) => ({ id: `vid-${index}`, fileUrl: url, fileType: 'VIDEO' }))
    ];
  };

  const mediaFiles = getMediaFiles();
  const currentMedia = mediaFiles[currentMediaIndex];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Media Viewer */}
      <div className="flex-1 relative flex items-center justify-center bg-black min-h-[50vh] md:min-h-screen">
        {/* Close Button Top Left */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full flex items-center justify-center text-white transition-colors z-10"
        >
          <FontAwesomeIcon icon={["fas", "xmark"]} className="text-xl" />
        </button>

        {mediaFiles.length > 1 && (
          <>
            {currentMediaIndex > 0 && (
              <button
                onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <FontAwesomeIcon icon={["fas", "chevron-left"]} className="text-2xl" />
              </button>
            )}
            {currentMediaIndex < mediaFiles.length - 1 && (
              <button
                onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <FontAwesomeIcon icon={["fas", "chevron-right"]} className="text-2xl" />
              </button>
            )}
          </>
        )}

        {currentMedia && (
          <div className="w-full h-full flex items-center justify-center p-4">
            {currentMedia.fileType === 'IMAGE' ? (
              <img
                src={currentMedia.fileUrl.startsWith('http') ? currentMedia.fileUrl : `http://localhost:8081${currentMedia.fileUrl}`}
                alt="Post media"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={currentMedia.fileUrl.startsWith('http') ? currentMedia.fileUrl : `http://localhost:8081${currentMedia.fileUrl}`}
                controls
                className="max-w-full max-h-full"
              />
            )}
          </div>
        )}
      </div>

      {/* Right Side: Post Details & Comments */}
      <div className="w-full md:w-[360px] lg:w-[400px] bg-white flex flex-col h-screen shrink-0 border-l border-gray-200">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : detailedPost ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
              <div className="flex-1 flex flex-col">
                {/* Post Header */}
                <div className="p-4 flex items-start space-x-3">
                  <UserAvatarWithModal
                    src={detailedPost.author?.avatar}
                    userId={detailedPost.author?.id}
                    name={detailedPost.author?.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] text-gray-900 leading-tight">
                      {detailedPost.author?.name || 'Người dùng'}
                    </h3>
                    <div className="flex items-center space-x-1 text-[13px] text-gray-500 mt-0.5">
                      <span className="hover:underline cursor-pointer">{formatDate(detailedPost.createdAt)}</span>
                      <span>·</span>
                      <span>{getPrivacyLabel(detailedPost.privacy)}</span>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:bg-gray-100 w-8 h-8 rounded-full transition-colors flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={["fas", "ellipsis"]} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3 text-[15px] text-gray-900 whitespace-pre-wrap break-words">
                  {detailedPost.content}
                </div>


                {/* Reactions Count */}
                <div className="px-4 py-2 border-b border-gray-200">
                  <ReactionCounts
                    postId={detailedPost.id}
                    reactions={detailedPost.reactions}
                    onOpenReactionsModal={() => {}}
                    onSelectReaction={handleReactionSelect}
                    reactionOfCurrentUser={getCurrentUserReaction() as EmotionType | null}
                    commentCount={commentCount}
                    shareCount={0}
                    className="px-0 py-0"
                  />
                </div>

                {/* Comments Section (Takes remaining space and scrolls comments list) */}
                <CommentsModal
                  isOpen={true}
                  onClose={() => {}}
                  postId={detailedPost.id}
                  postOwnerId={detailedPost.author?.id}
                  isSidebarMode={true}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
