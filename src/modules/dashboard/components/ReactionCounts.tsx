import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import reactionsApi, { type EmotionType } from "../../../services/reactionsApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import likeIcon from "../../../assets/like.svg";
import loveIcon from "../../../assets/love.svg";
import hahaIcon from "../../../assets/haha.svg";
import wowIcon from "../../../assets/wow.svg";
import sadIcon from "../../../assets/sad.svg";
import angryIcon from "../../../assets/angry.svg";

interface ReactionCountsProps {
  postId: string;
  reactions?: Array<{ emotionType: string }>;
  onOpenReactionsModal?: () => void;
  className?: string;
}

export default function ReactionCounts({ postId, reactions: reactionsFromProps, onOpenReactionsModal, className }: ReactionCountsProps) {
  const queryClient = useQueryClient();

  // Tính counts từ props nếu có
  const countsFromProps = useMemo(() => {
    if (reactionsFromProps === undefined) return null;
    const counts: Record<EmotionType, number> = {
      like: 0,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };
    
    reactionsFromProps.forEach(reaction => {
      if (reaction.emotionType && reaction.emotionType in counts) {
        counts[reaction.emotionType as EmotionType]++;
      }
    });
    
    return counts;
  }, [reactionsFromProps]);

  // React Query: Fetch reaction counts từ API
  const {
    data: apiCounts,
    isLoading,
    error: queryError,
  } = useQuery<Record<EmotionType, number>>({
    queryKey: queryKeys.reactions.postCounts(postId),
    queryFn: () => reactionsApi.getAllPostReactionCounts(postId),
    enabled: reactionsFromProps === undefined, // Chỉ fetch nếu không có props
    staleTime: 10_000, // Cache ngắn hơn vì reaction thay đổi thường xuyên
    refetchOnWindowFocus: false,
  });

  // Sử dụng counts từ props nếu có, nếu không thì dùng từ API
  const reactionCounts = countsFromProps || apiCounts || {
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };

  const loading = reactionsFromProps === undefined && isLoading;
  const error = reactionsFromProps === undefined && queryError ? "Failed to load reactions" : null;

  // Invalidate query khi có reaction-updated event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: "post" | "comment" | "reply"; targetId: string };
      if (!detail) return;
      if (detail.targetType !== "post" || detail.targetId !== postId) return;
      
      console.log("ReactionCounts: Reaction updated, invalidating query");
      queryClient.invalidateQueries({
        queryKey: queryKeys.reactions.postCounts(postId),
      });
    };

    window.addEventListener("reaction-updated", handler as EventListener);
    return () => window.removeEventListener("reaction-updated", handler as EventListener);
  }, [postId, queryClient]);

  const reactionIcons: Record<EmotionType, string> = {
    like: likeIcon,
    love: loveIcon,
    haha: hahaIcon,
    wow: wowIcon,
    sad: sadIcon,
    angry: angryIcon,
  };

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <div className={`px-4 py-2 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 bg-gray-200 animate-pulse rounded"></div>
          <span>Loading reactions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-4 py-2 ${className}`}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (totalReactions === 0) {
    return null;
  }

  return (
    <div className={`px-4 py-2 ${className}`}>
      <div className="flex items-center gap-2 text-mx text-gray-600">
        <div className="flex items-center gap-1">
          {Object.entries(reactionCounts).map(([emotion, count]) => {
            if (count === 0) return null;
            return (
              <img
                key={emotion}
                src={reactionIcons[emotion as EmotionType]}
                alt={emotion}
                className="w-5 h-5"
                title={`${count} ${emotion}`}
              />
            );
          })}
        </div>
        {onOpenReactionsModal ? (
          <button
            onClick={onOpenReactionsModal}
            className="text-gray-700 hover:text-blue-700 font-medium"
            aria-label="Xem tất cả cảm xúc"
          >
            {totalReactions}
          </button>
        ) : (
          <span className="text-gray-700 font-medium">{totalReactions}</span>
        )}
      </div>
    </div>
  );
}
