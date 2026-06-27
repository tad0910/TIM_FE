import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllPosts, getPostsByUser } from "../../../services/postApi";
import type { Post } from "../../../types/post";
import { queryKeys } from "../../../hooks/api/queryKeys";
import PostCard from "./PostCard";
import PostCardSkeleton from "../../../components/PostCardSkeleton";
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

interface InfiniteScrollPostListProps {
  userId?: string;
  showUserPostsOnly?: boolean;
  refreshTrigger?: number;
}

const InfiniteScrollPostList: React.FC<InfiniteScrollPostListProps> = ({
  userId,
  showUserPostsOnly = false,
  refreshTrigger,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const allUserPostsRef = useRef<Post[] | null>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 6;

  // React Query: Fetch posts (initial load)
  const {
    data: initialPostsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Post[]>({
    queryKey: showUserPostsOnly && userId
      ? queryKeys.posts.user(userId)
      : queryKeys.posts.all({ page: 0, size: PAGE_SIZE }),
    queryFn: async () => {
      if (showUserPostsOnly && userId) {
        const allUserPosts = await getPostsByUser(userId);
        const filteredPosts = filterPostsByPrivacy(allUserPosts, user?.id);
        const sorted = filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Store all posts in ref for pagination
        allUserPostsRef.current = sorted;
        return sorted;
      } else {
        const page0 = await getAllPosts(0, PAGE_SIZE);
        const filtered = filterPostsByPrivacy(page0, user?.id);
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    enabled: Boolean(!showUserPostsOnly || userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Update posts when initial data changes
  useEffect(() => {
    if (initialPostsData) {
      if (showUserPostsOnly && userId) {
        allUserPostsRef.current = initialPostsData;
        const initial = initialPostsData.slice(0, PAGE_SIZE);
        setPosts(initial);
        setHasMore(initialPostsData.length > PAGE_SIZE);
      } else {
        setPosts(initialPostsData);
        setHasMore(initialPostsData.length === PAGE_SIZE);
      }
      setPage(0);
    }
  }, [initialPostsData, showUserPostsOnly, userId]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      queryClient.invalidateQueries({
        queryKey: showUserPostsOnly && userId
          ? queryKeys.posts.user(userId)
          : queryKeys.posts.all(),
      });
      allUserPostsRef.current = null; // Reset cache for user posts
      refetch();
    }
  }, [refreshTrigger, queryClient, refetch, showUserPostsOnly, userId]);

  const error = queryError ? (queryError instanceof Error && queryError.message.includes('500')
    ? "Hệ thống đang bảo trì. Vui lòng thử lại sau."
    : "Không thể tải danh sách bài viết") : null;

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      let newData: Post[] = [];

      if (showUserPostsOnly && userId) {
        if (!allUserPostsRef.current) {
          // Fetch all user posts using React Query cache
          const cachedData = queryClient.getQueryData<Post[]>(
            queryKeys.posts.user(userId)
          );
          if (cachedData) {
            allUserPostsRef.current = cachedData;
          } else {
            const allUserPosts = await getPostsByUser(userId);
            const filtered = filterPostsByPrivacy(allUserPosts, user?.id);
            allUserPostsRef.current = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            // Cache the data
            queryClient.setQueryData(
              queryKeys.posts.user(userId),
              allUserPostsRef.current
            );
          }
        }
        const start = nextPage * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        newData = (allUserPostsRef.current || []).slice(start, end);
        setHasMore(end < (allUserPostsRef.current?.length || 0));
      } else {
        // Fetch next page using React Query cache
        const queryKey = queryKeys.posts.all({ page: nextPage, size: PAGE_SIZE });
        const cachedData = queryClient.getQueryData<Post[]>(queryKey);
        
        if (cachedData) {
          newData = cachedData;
        } else {
          // Fetch and cache
          const pageData = await getAllPosts(nextPage, PAGE_SIZE);
          const filtered = filterPostsByPrivacy(pageData, user?.id);
          newData = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          queryClient.setQueryData(queryKey, newData);
        }
        setHasMore(newData.length === PAGE_SIZE);
      }

      setPosts(prev => [...prev, ...newData]);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, showUserPostsOnly, userId, user?.id, queryClient]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMorePosts]);

  useEffect(() => {
    if (posts.length > 0 && loadMoreRef.current && observerRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [posts.length]);

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({
              queryKey: showUserPostsOnly && userId
                ? queryKeys.posts.user(userId)
                : queryKeys.posts.all(),
            });
            refetch();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-500 text-lg">Không có bài viết nào</div>
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
      
      {loadingMore && (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <PostCardSkeleton key={`loading-${index}`} />
          ))}
        </div>
      )}
      
      <div ref={loadMoreRef} className="h-4" />
      
      {!hasMore && posts.length > 0 && (
        <div className="text-center p-4 text-gray-500">
          Đã hiển thị tất cả bài viết
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollPostList;
