import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import reactionsApi, { type EmotionType } from "../../../services/reactionsApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";
import ReactionBar from "./ReactionBar";
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
  onOpenComments?: () => void;
  onSelectReaction?: (emotion: EmotionType) => Promise<void>;
  reactionOfCurrentUser?: EmotionType | null;
  className?: string;
  commentCount?: number;
  shareCount?: number;
}

export default function ReactionCounts({
  postId,
  reactions: reactionsFromProps,
  onOpenReactionsModal,
  onOpenComments,
  onSelectReaction,
  reactionOfCurrentUser = null,
  className,
  commentCount = 0,
  shareCount = 0,
}: ReactionCountsProps) {
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

  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);
  const showReactionBarTimeoutRef = useRef<number | null>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (showReactionBarTimeoutRef.current) clearTimeout(showReactionBarTimeoutRef.current);
      if (hideReactionBarTimeoutRef.current) clearTimeout(hideReactionBarTimeoutRef.current);
    };
  }, []);

  const updateReactionBarPosition = () => {
    if (likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setPortalPos({
        top: rect.top - 48,
        left: rect.left,
      });
    }
  };

  const showReactionBarHandler = () => {
    if (hideReactionBarTimeoutRef.current) clearTimeout(hideReactionBarTimeoutRef.current);
    showReactionBarTimeoutRef.current = window.setTimeout(() => {
      updateReactionBarPosition();
      setShowReactionBar(true);
    }, 500);
  };

  const hideReactionBarHandler = () => {
    if (showReactionBarTimeoutRef.current) clearTimeout(showReactionBarTimeoutRef.current);
    hideReactionBarTimeoutRef.current = window.setTimeout(() => {
      setShowReactionBar(false);
    }, 200);
  };

  const handleReactionSelectInternal = async (emotion: EmotionType) => {
    setShowReactionBar(false);
    if (onSelectReaction) {
      await onSelectReaction(emotion);
    }
  };

  const getReactionColor = (emotion: EmotionType) => {
    switch (emotion) {
      case "like": return "#1877f2";
      case "love": return "#f33e58";
      case "haha":
      case "wow":
      case "sad":
      case "angry":
        return "#eab308";
      default: return undefined;
    }
  };

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

  if (totalReactions === 0 && commentCount === 0 && shareCount === 0) {
    return null;
  }

  // Get active emotions sorted by count descending
  const activeEmotions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion]) => emotion as EmotionType);

  return (
    <div className={`px-4 py-2 ${className} flex items-center justify-between w-full`}>
      {/* Left side: Outline counts */}
      <div className="flex items-center gap-5 text-[14px] text-gray-500 font-medium">
        <div
          className="relative"
          onMouseEnter={showReactionBarHandler}
          onMouseLeave={hideReactionBarHandler}
        >
          <button
            ref={likeButtonRef}
            onClick={async () => {
              if (onSelectReaction) {
                const target = reactionOfCurrentUser ? reactionOfCurrentUser : "like";
                await onSelectReaction(target);
              }
            }}
            className={`flex items-center gap-1.5 transition-colors ${
              reactionOfCurrentUser ? "font-semibold" : "hover:text-blue-600 text-gray-500"
            }`}
            style={{
              color: reactionOfCurrentUser ? getReactionColor(reactionOfCurrentUser) : undefined
            }}
            title="Thích"
          >
            {reactionOfCurrentUser ? (
              <img
                src={reactionIcons[reactionOfCurrentUser]}
                alt={reactionOfCurrentUser}
                className="w-[18px] h-[18px] object-contain scale-110"
              />
            ) : (
              <FontAwesomeIcon icon={["far", "thumbs-up"]} className="text-base" />
            )}
            <span>{totalReactions}</span>
          </button>

          {showReactionBar &&
            portalPos &&
            require("react-dom").createPortal(
              <div
                style={{
                  position: "fixed",
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
                onMouseLeave={hideReactionBarHandler}
              >
                <ReactionBar onSelect={handleReactionSelectInternal} />
              </div>,
              document.body
            )}
        </div>

        <button
          onClick={onOpenComments}
          className="flex items-center gap-1.5 hover:text-blue-600 text-gray-500 transition-colors"
          title="Bình luận"
        >
          <FontAwesomeIcon icon={["far", "comment"]} className="text-base" />
          <span>{commentCount}</span>
        </button>

        <div
          className="flex items-center gap-1.5 hover:text-blue-600 text-gray-500 transition-colors cursor-pointer"
          title="Chia sẻ"
        >
          <FontAwesomeIcon icon={["far", "share-from-square"]} className="text-base" />
          <span>{shareCount}</span>
        </div>
      </div>

      {/* Right side: Stacked overlapping bubbles */}
      {totalReactions > 0 && (
        <div 
          onClick={onOpenReactionsModal}
          className="flex items-center -space-x-1 hover:opacity-85 transition-opacity cursor-pointer"
          title="Xem chi tiết cảm xúc"
        >
          {activeEmotions.slice(0, 3).map((emotion) => (
            <div 
              key={emotion} 
              className="w-[18px] h-[18px] rounded-full border border-white flex items-center justify-center bg-white shadow-sm overflow-hidden"
            >
              <img
                src={reactionIcons[emotion]}
                alt={emotion}
                className="w-full h-full object-cover scale-110"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
