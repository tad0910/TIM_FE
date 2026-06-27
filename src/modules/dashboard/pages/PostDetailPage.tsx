import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostById } from '../../../services/postApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/NotificationPopup';
import type { Post } from '../../../types/post';
import UserAvatarWithModal from '../../../components/UserAvatarWithModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../../fontawesome';
import ReactionBar from '../components/ReactionBar';
import { type EmotionType } from '../../../services/reactionsApi';
import ReactionCounts from '../components/ReactionCounts';
import CommentsModal from '../components/CommentsModal';
import { parseBackendDate } from '../../../utils/timeFormat';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notification, hideNotification, showApiError } = useNotification();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('PostDetailPage: Loading post with ID:', postId, 'for user:', user?.id);
      const postData = await getPostById(postId);
      console.log('PostDetailPage: Loaded post data:', postData);
      setPost(postData);
    } catch (err) {
      console.error('Error loading post:', err);
      const message = showApiError(err, 'Không thể tải thông tin bài viết. Vui lòng thử lại.', 'Lỗi tải bài viết');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id, showApiError]);

  useEffect(() => {
    if (postId && user?.id) {
      loadPost();
    }
  }, [postId, user?.id, loadPost]);

  const handleReactionSelect = async (emotion: EmotionType) => {
    if (!user?.id || !post) return;
    
    try {
      console.log('Selected emotion:', emotion, 'for post:', post.id);
    } catch (err) {
      console.error('Failed to handle reaction:', err);
    }
  };

  const formatDate = (dateString: string | number[] | null | undefined) => {
    if (!dateString) return '';
    const date = parseBackendDate(dateString);
    if (!date) return '';
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('document')) return 'Word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'PowerPoint';
    if (fileType.includes('image')) return 'Hình ảnh';
    if (fileType.includes('video')) return 'Video';
    if (fileType.includes('audio')) return 'Âm thanh';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'Nén';
    return 'Tệp';
  };

  const hasMediaFiles = (post: Post) => {
    return (post.documents && post.documents.length > 0) || 
           (post.images && post.images.length > 0) || 
           (post.videos && post.videos.length > 0);
  };

  const getMediaFiles = (post: Post) => {
    const files: Array<{id: string; name: string; url: string; type: string}> = [];
    
    if (post.documents) {
      files.push(...post.documents.map(doc => ({ ...doc, type: 'document' })));
    }
    
    if (post.images) {
      files.push(...post.images.map((img, index) => ({ 
        id: `img_${index}`, 
        name: `Hình ảnh ${index + 1}`, 
        url: img, 
        type: 'image' 
      })));
    }
    
    if (post.videos) {
      files.push(...post.videos.map((vid, index) => ({ 
        id: `vid_${index}`, 
        name: `Video ${index + 1}`, 
        url: vid, 
        type: 'video' 
      })));
    }
    
    return files;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={['fas', 'exclamation-triangle']} className="text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải bài viết</h2>
          <p className="text-gray-600 mb-4">{error || 'Bài viết không tồn tại'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FontAwesomeIcon icon={['fas', 'arrow-left']} className="mr-2" />
          Quay lại
        </button>

        {/* Post Content */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3 mb-4">
                             <UserAvatarWithModal
                 src={post.author?.avatar}
                 userId={post.author?.id}
                 authorName={post.author?.name}
                 size="md"
               />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {post.author?.name || 'Người dùng'}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{formatDate(post.createdAt)}</span>
                  <span>•</span>
                  <span>{getPrivacyLabel(post.privacy)}</span>
                </div>
              </div>
            </div>

            {/* Post Text */}
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>

          {/* Media Content */}
          {(post.image || post.images) && (
            <div className="bg-gray-100 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(post.images || [post.image!]).map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-auto rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Video Content */}
          {(post.video || post.videos) && (
            <div className="bg-gray-100 p-1">
              {(post.videos || [post.video!]).map((videoUrl, index) => (
                <video
                  key={index}
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                >
                  Trình duyệt của bạn không hỗ trợ video.
                </video>
              ))}
            </div>
          )}

          {/* Document Files */}
          {hasMediaFiles(post) && (
            <div className="p-6 border-t">
              <h4 className="font-semibold text-gray-900 mb-4">Tệp đính kèm</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMediaFiles(post).map((file, index) => {
                  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    try {
                      // Fetch file as blob
                      const response = await fetch(file.url);
                      const blob = await response.blob();
                      
                      // Create download link with proper filename
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = file.name || `document_${index + 1}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error downloading file:', error);
                      // Fallback: open in new tab
                      window.open(file.url, '_blank');
                    }
                  };

                  return (
                    <div key={file.id || index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <FontAwesomeIcon 
                        icon="file" 
                        className="text-2xl text-gray-600 mr-3" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getFileTypeLabel(file.type || 'file')}
                        </p>
                      </div>
                      <a
                        href={file.url}
                        onClick={handleDownload}
                        className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                      >
                        Tải xuống
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reactions */}
          <div className="mb-4">
            <ReactionCounts
              postId={post!.id}
              reactions={post!.reactions}
              onOpenReactionsModal={() => setShowReactionBar(!showReactionBar)}
            />
            {showReactionBar && (
              <div className="mt-2">
                <ReactionBar onSelect={handleReactionSelect} />
              </div>
            )}
          </div>

        {/* Comments Preview */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Bình luận ({post.comments?.length || 0})
            </h4>
            {post.comments && post.comments.length > 0 && (
              <button
                onClick={() => setShowComments(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                Xem tất cả
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t flex justify-between text-sm text-gray-600">
            <button
              onClick={() => setShowReactionBar(!showReactionBar)}
              className="hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={['far', 'thumbs-up']} className="mr-1" />
              Like
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={['far', 'comment']} className="mr-1" />
              Comment
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText?.(window.location.href)}
              className="hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={['far', 'share-from-square']} className="mr-1" />
              Share
            </button>
          </div>

          {/* Recent Comments */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(Array.isArray(post?.comments) ? (post!.comments as any[]) : [])
              .slice(0, 3)
              .map((comment: any, index: number) => (
              <div key={comment?.id ?? index} className="flex space-x-2">
                <UserAvatarWithModal
                  src={comment?.userAvatar}
                  userId={comment?.userId}
                  authorName={comment?.username}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment?.username || 'Người dùng'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {comment?.createdAt ? formatDate(comment.createdAt) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{comment?.content}</p>
                  </div>

                  {Array.isArray(comment?.replyComments) && comment.replyComments.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2">
                      {comment.replyComments.slice(0, 2).map((reply: any, replyIndex: number) => (
                        <div key={reply?.id ?? replyIndex} className="flex space-x-2">
                          <UserAvatarWithModal
                            src={reply?.userAvatar}
                            userId={reply?.userId}
                            authorName={reply?.username || 'Người dùng'}
                            size="xs"
                          />
                          <div className="flex-1">
                            <div className="bg-gray-100 rounded-lg p-2">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-xs text-gray-900">
                                  {reply?.username || 'Người dùng'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {reply?.createdAt ? formatDate(reply.createdAt) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-gray-800">{reply?.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View All Comments Button */}
          {Array.isArray(post?.comments) && post!.comments.length > 3 && (
            <div className="p-4 border-t">
              <button
                onClick={() => setShowComments(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Xem tất cả {post!.comments.length} bình luận
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Full Comments Modal */}
      {post && (
        <CommentsModal
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          postId={post!.id}
          postOwnerId={post!.author?.id}
        />
      )}

      {/* Notification Popup */}
      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}
