import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontawesome';
import { getPostById } from '../services/postApi';
import { useNotification } from '../hooks/useNotification';
import NotificationPopup from '../components/NotificationPopup';
import PostDetailNavbar from '../components/PostDetailNavbar';
import PostMediaViewer from '../components/PostMediaViewer';
import PostDetailPanel from '../components/PostDetailPanel';
import type { Post } from '../types/post';
import EditPostModal from '../components/EditPostModal';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import ReactionsModal from '../modules/dashboard/components/ReactionsModal';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { notification, showSuccess, showWarning, hideNotification, showApiError } =
    useNotification();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);


  const loadPost = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError(null);
      const postData = await getPostById(postId);
      setPost(postData);
    } catch (err) {
      console.error('Error loading post:', err);
      const message = showApiError(err, 'Không thể tải thông tin bài viết. Vui lòng thử lại.', 'Lỗi tải bài viết');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPost(updatedPost);
    showSuccess('Cập nhật bài viết thành công', 'Bài viết đã được cập nhật');
    setShowEditModal(false);
  };

  const handlePostDeleted = () => {
    showSuccess('Xóa bài viết thành công', 'Bài viết đã được xóa khỏi hệ thống');
    navigate('/');
  };

  const handleDeleteError = (error: string) => {
    showWarning('Lỗi khi xóa bài viết', error);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleCommentClick = () => {
    setTimeout(() => {
      const commentsSection = document.getElementById('comments-section');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
      }
      const commentInput = document.querySelector('#comments-section textarea');
      if (commentInput) {
        (commentInput as HTMLTextAreaElement).focus();
      }
    }, 300);
  };

  const handleShareClick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showSuccess('Đã copy link', 'Link bài viết đã được copy vào clipboard');
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Đã copy link', 'Link bài viết đã được copy vào clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <FontAwesomeIcon
            icon={['fas', 'exclamation-triangle']}
            className="text-6xl text-red-500 mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Không thể tải bài viết
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'Bài viết không tồn tại'}
          </p>
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
    <>
      <div className="h-screen flex flex-col lg:flex-row" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="flex-1 lg:flex-[2] lg:min-h-0">
          <PostMediaViewer 
            post={post} 
            onClose={() => navigate(-1)} 
          />
        </div>

        <div className="flex-1 lg:flex-[1] lg:min-w-0 lg:max-w-md flex flex-col relative z-10">
          <PostDetailNavbar />
          
          <PostDetailPanel
            post={post}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCommentClick={handleCommentClick}
            onShareClick={handleShareClick}
            onOpenReactionsModal={() => setShowReactionsModal(true)}
          />
        </div>
      </div>

      {post && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handlePostUpdated}
        />
      )}

      {post && (
        <DeleteConfirmDialog
          post={post}
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={handlePostDeleted}
          onError={handleDeleteError}
        />
      )}

      <NotificationPopup
        notification={notification}
        onClose={hideNotification}
      />

      {/* Reactions Modal */}
      {post && (
        <ReactionsModal
          isOpen={showReactionsModal}
          onClose={() => setShowReactionsModal(false)}
          target={{ type: 'post', id: post.id }}
        />
      )}
    </>
  );
}

