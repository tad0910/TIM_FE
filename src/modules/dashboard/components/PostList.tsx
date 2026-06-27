import React, { useState, useEffect } from "react";
import { getAllPosts, getPostsByUser } from "../../../services/postApi";
import type { Post } from "../../../types/post";
import PostCard from "./PostCard";
import { useAuthStore } from "../../../store/useAuthStore";

const filterPostsByPrivacy = (
  posts: Post[],
  currentUserId?: string
): Post[] => {
  return posts.filter((post) => {
    if (!currentUserId) {
      return post.privacy === "open";
    }

    if (post.author?.id === currentUserId) {
      return true;
    }

    switch (post.privacy) {
      case "open":
        return true;
      case "friends":
        return true;
      case "only_me":
        return false;
      default:
        return true;
    }
  });
};

interface PostListProps {
  userId?: string;
  showUserPostsOnly?: boolean;
}

const PostList: React.FC<PostListProps> = ({
  userId,
  showUserPostsOnly = false,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadPosts();
  }, [userId, showUserPostsOnly]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let data: Post[];

      if (showUserPostsOnly && userId) {
        data = await getPostsByUser(userId);
      } else {
        data = await getAllPosts();
      }

      const filteredPosts = filterPostsByPrivacy(data, user?.id);
      
      const sortedPosts = filteredPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setPosts(sortedPosts);
      setError(null);
    } catch (err) {
      console.error("Error loading posts:", err);
      
      if (err instanceof Error && err.message.includes('500')) {
        setError("Hệ thống đang bảo trì. Vui lòng thử lại sau.");
      } else {
        setError("Không thể tải danh sách bài viết");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post));
      return updatedPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    });
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  const handleNewPostCreated = () => {
    loadPosts();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Không có bài viết nào</p>
        </div>
      ) : (
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
    </div>
  );
};

export default PostList;
