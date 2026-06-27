import React, { useState, useEffect } from 'react';
import { getPostsByUser } from '../../../services/postApi';
import type { Post } from '../../../types/post';
import PostCard from '../../dashboard/components/PostCard';

interface ProfilePostsProps {
  userId: string;
}

export default function ProfilePosts({ userId }: ProfilePostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserPosts();
  }, [userId]);

  const loadUserPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPosts = await getPostsByUser(userId);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading user posts:', error);
      setError('Không thể tải bài viết của người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.filter(post => post.id !== postId)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải bài viết...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadUserPosts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <p className="text-gray-600 text-lg">Chưa có bài viết nào</p>
        <p className="text-gray-500 text-sm">Hãy tạo bài viết đầu tiên của bạn!</p>
      </div>
    );
  }

  return (
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
  );
}
