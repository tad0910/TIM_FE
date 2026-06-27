import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPosts } from '../services/postApi';
import type { Post } from '../types/post';
import PostCard from '../modules/dashboard/components/PostCard';
import PostCardSkeleton from '../components/PostCardSkeleton';
import { useNotification } from '../hooks/useNotification';
import NotificationPopup from '../components/NotificationPopup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontawesome';

export default function FeedPage() {
  const navigate = useNavigate();
  const { notification, hideNotification, showApiError } = useNotification();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPosts(0, 20);
      setPosts(data || []);
    } catch (err) {
      console.error('Error loading posts:', err);
      const message = showApiError(err, 'Không thể tải danh sách bài viết. Vui lòng thử lại.', 'Lỗi tải bài viết');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feed</h1>
          <p className="text-gray-600 mt-2">Xem các bài viết mới nhất từ bạn bè</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon
                icon={['fas', 'exclamation-triangle']}
                className="text-red-500 text-2xl"
              />
              <div>
                <h3 className="font-semibold text-red-800">Lỗi tải bài viết</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={loadPosts}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={['far', 'file-lines']}
              className="text-6xl text-gray-400 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Chưa có bài viết nào
            </h3>
            <p className="text-gray-500">
              Hãy tạo bài viết đầu tiên của bạn!
            </p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && !error && posts.length > 0 && posts.length >= 20 && (
          <div className="text-center mt-8">
            <button
              onClick={loadPosts}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FontAwesomeIcon icon={['fas', 'refresh']} className="mr-2" />
              Tải thêm bài viết
            </button>
          </div>
        )}

        {/* Notification Popup */}
        <NotificationPopup
          notification={notification}
          onClose={hideNotification}
        />
      </div>
    </div>
  );
}

