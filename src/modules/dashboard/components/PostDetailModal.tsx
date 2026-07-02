import { useState, useEffect, useCallback, useRef } from 'react';
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

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostDetailModal({ 
  post, 
  isOpen, 
  onClose
}: PostDetailModalProps) {
  const { user } = useAuthStore();
  const [detailedPost, setDetailedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [showReactionBar, setShowReactionBar] = useState(false);
  const showReactionBarTimeoutRef = useRef<number | null>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);
  const [showComments, setShowComments] = useState(false);
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
      console.log('PostDetailModal: Loading post with ID:', post.id, 'for user:', user!.id);
      const postData = await getPostById(post.id);
      console.log('PostDetailModal: Loaded post data:', postData);
      console.log('PostDetailModal: Author data:', {
        author: postData.author,
        avatar: postData.author?.avatar,
        name: postData.author?.name
      });
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
  }, [post.id, user]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadDetailedPost();
    }
  }, [isOpen, user?.id, loadDetailedPost]);

  const handleReactionSelect = async (emotion: EmotionType) => {
    if (!user?.id || !detailedPost) return;

    try {
      // Check if user already reacted by getting all reactions and finding user's reaction
      const reactions = await reactionsApi.getReactionsByPostId(detailedPost.id);
      const userReaction = reactions.find(r => String(r.userId) === String(user.id));
      
      if (userReaction && userReaction.emotionType === emotion) {
        // Remove reaction
        await reactionsApi.deletePostReaction(detailedPost.id, { userId: user.id });
      } else {
        // Add or update reaction
        await reactionsApi.createOrUpdatePostReaction(detailedPost.id, { userId: user.id, emotionType: emotion });
      }
      
      // Reload post data silently to get updated reaction counts
      await loadDetailedPost(true);
      
      // Sync with main feed
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
      default: return 'Không xác định';
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

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'IMAGE': return '🖼️';
      case 'VIDEO': return '🎥';
      case 'DOCUMENT': return '📄';
      default: return '📎';
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'IMAGE': return 'Hình ảnh';
      case 'VIDEO': return 'Video';
      case 'DOCUMENT': return 'Tài liệu';
      default: return 'File';
    }
  };

  const hasMediaFiles = () => {
    if (!detailedPost) return false;
    
    // Check for legacy image/video fields
    const hasLegacyMedia = detailedPost.image || detailedPost.images?.length || 
                          detailedPost.video || detailedPost.videos?.length;
    
    return hasLegacyMedia;
  };

  const getMediaFiles = () => {
    if (!detailedPost) return [];
    
    // Include legacy image/video fields
    const legacyImages = detailedPost.images || (detailedPost.image ? [detailedPost.image] : []);
    const legacyVideos = detailedPost.videos || (detailedPost.video ? [detailedPost.video] : []);
    
    // Convert legacy fields to file-like objects
    const legacyMediaFiles = [
      ...legacyImages.map((url, index) => ({
        id: `legacy-image-${index}`,
        fileUrl: url,
        fileType: 'IMAGE'
      })),
      ...legacyVideos.map((url, index) => ({
        id: `legacy-video-${index}`,
        fileUrl: url,
        fileType: 'VIDEO'
      }))
    ];
    
    return legacyMediaFiles;
  };

  const getDocumentFiles = () => {
    return detailedPost?.documents || [];
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b relative">
          <h2 className="text-xl font-bold w-full text-center">Bài viết của {detailedPost?.author?.name || 'Người dùng'}</h2>
          <button
            onClick={onClose}
            className="absolute right-4 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          {loading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <div className="text-red-600 text-4xl mb-2">❌</div>
              <p className="text-red-600">{error}</p>
            </div>
          ) : detailedPost ? (
            <div className="flex-1 flex flex-col">
              {/* Media First (Like user's screenshot) */}
              {hasMediaFiles() && (
                <div className="w-full bg-black flex items-center justify-center max-h-[600px] overflow-hidden">
                  {getMediaFiles().map((file, index) => (
                    <div key={index} className="w-full h-full flex items-center justify-center">
                      {file.fileType === 'IMAGE' ? (
                        <img
                          src={file.fileUrl.startsWith('http') ? file.fileUrl : `http://localhost:8081${file.fileUrl}`}
                          alt="Post media"
                          className="w-full h-auto object-contain max-h-[600px]"
                          onError={(e) => {
                            console.error('Image load error:', file.fileUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : file.fileType === 'VIDEO' ? (
                        <video
                          src={file.fileUrl.startsWith('http') ? file.fileUrl : `http://localhost:8081${file.fileUrl}`}
                          controls
                          className="w-full h-auto max-h-[600px]"
                          onError={() => {
                            console.error('Video load error:', file.fileUrl);
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Post Info */}
              <div className="p-4 bg-white">
                <div className="flex items-center space-x-3 mb-3">
                  <UserAvatarWithModal
                    src={detailedPost.author?.avatar}
                    userId={detailedPost.author?.id}
                    name={detailedPost.author?.name}
                    size="md"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-[15px] text-gray-900 leading-tight">
                      {detailedPost.author?.name || 'Người dùng'}
                    </h3>
                    <div className="flex items-center space-x-1 text-[13px] text-gray-500 mt-0.5">
                      <span className="hover:underline cursor-pointer">{formatDate(detailedPost.createdAt)}</span>
                      <span>·</span>
                      <span>{getPrivacyLabel(detailedPost.privacy)}</span>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <FontAwesomeIcon icon={["fas", "ellipsis"]} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="mb-4 text-[15px] text-gray-900 whitespace-pre-wrap">
                  {detailedPost.content}
                </div>

                {/* Documents */}
                {getDocumentFiles().length > 0 && (
                  <div className="mb-4">
                    <div className="space-y-2">
                      {getDocumentFiles().map((file, index) => (
                        <a
                          key={index}
                          href={file.url.startsWith('http') ? file.url : `http://localhost:8081${file.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-2xl">{getFileIcon(file.type)}</span>
                          <span className="text-[15px] font-medium text-gray-900 truncate">
                            {file.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}



                {/* Reactions */}
                <div className="py-2 border-t border-b border-gray-200 mt-4">
                  <ReactionCounts
                    postId={detailedPost.id}
                    reactions={detailedPost.reactions}
                    onOpenReactionsModal={() => {}}
                    onSelectReaction={handleReactionSelect}
                    reactionOfCurrentUser={getCurrentUserReaction() as EmotionType | null}
                    commentCount={commentCount}
                    shareCount={0}
                  />
                </div>

                {/* Comments Section */}
                <CommentsModal
                  isOpen={true}
                  onClose={() => {}}
                  postId={detailedPost.id}
                  postOwnerId={detailedPost.author?.id}
                  isSidebarMode={true}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
