import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Post } from "../../../types/post";
import type { Reaction } from "../../../types/post";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNotification } from "../../../hooks/useNotification";
import NotificationPopup from "../../../components/NotificationPopup";
import EditPostModal from "../../../components/EditPostModal";
import DeleteConfirmDialog from "../../../components/DeleteConfirmDialog";
import PrivacySettings from "../../../components/PrivacySettings";
import ModernPhotoGrid from "../../../components/ModernPhotoGrid";
import PostDetailModal from "./PostDetailModal";
import PhotoViewerModal from "./PhotoViewerModal";
import UserAvatarWithModal from "../../../components/UserAvatarWithModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";
import ReactionBar from "./ReactionBar";
import reactionsApi, { type EmotionType } from "../../../services/reactionsApi";
import ReactionsModal from "./ReactionsModal";
import ReactionCounts from "./ReactionCounts";
import LinkPreview from "../../../components/LinkPreview";
import { getFirstUrl } from "../../../utils/linkUtils";
import { useIsAdminSimple } from "../../../utils/useIsAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../hooks/api/queryKeys";

import likeIcon from "../../../assets/like.svg";
import loveIcon from "../../../assets/love.svg";
import hahaIcon from "../../../assets/haha.svg";
import wowIcon from "../../../assets/wow.svg";
import sadIcon from "../../../assets/sad.svg";
import angryIcon from "../../../assets/angry.svg";
interface PostCardProps {
  post: Post;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
}
export default function PostCard({
  post,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);
  const showReactionBarTimeoutRef = useRef<number | null>(null);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionOfCurrentUser, setReactionOfCurrentUser] =
    useState<EmotionType | null>(null);
  const [localReactions, setLocalReactions] = useState<Reaction[]>(post.reactions || []);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdminSimple();
  const navigate = useNavigate();
  const { notification, showSuccess, hideNotification, showApiError } =
    useNotification();
  const [isDeleting, setIsDeleting] = useState(false);
  const likeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [commentCount, setCommentCount] = useState<number>(
    typeof post.totalComments === 'number' ? post.totalComments : (post.comments ? post.comments.length : 0)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActions) {
        const target = event.target as HTMLElement;
        if (!target.closest(".relative")) {
          setShowActions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActions]);

  useEffect(() => {
    console.log("Notification state changed:", notification);
  }, [notification]);

  const handlePostDeleted = (postId: string) => {
    try {
      showSuccess(
        "Xóa bài viết thành công",
        "Bài viết đã được xóa khỏi hệ thống",
        3000
      );
      setIsDeleting(true);
      setTimeout(() => {
        onPostDeleted(postId);
      }, 3000);
    } catch (err) {
      console.error("Error in handlePostDeleted:", err);
      showApiError(err, "Có lỗi xảy ra khi xóa bài viết", "Lỗi khi xóa bài viết");
    }
  };

  const handleDeleteError = (error: string) => {
    showApiError(error, "Có lỗi xảy ra khi xóa bài viết", "Lỗi khi xóa bài viết");
  };

  const handlePostUpdated = (updatedPost: Post) => {
    try {
      onPostUpdated(updatedPost);
      showSuccess("Cập nhật bài viết thành công", "Bài viết đã được cập nhật");
    } catch (err) {
      console.error("Error updating post:", err);
      showApiError(
        err,
        "Không thể cập nhật bài viết. Vui lòng thử lại.",
        "Lỗi khi cập nhật bài viết"
      );
    }
  };
  
  useEffect(() => {
    if (!user?.id || !post.reactions) return;
    setLocalReactions(post.reactions);
    
    const currentUserReaction = post.reactions.find(
      (r: { userId: string | number; emotionType: EmotionType }) =>
        String(r.userId) === String(user.id)
    );
    const emotion = currentUserReaction?.emotionType as EmotionType | undefined;
    setReactionOfCurrentUser(emotion ?? null);
  }, [post.reactions, user?.id]);
  
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: 'post'; targetId: string };
      if (detail && detail.targetType === 'post' && detail.targetId === post.id) {
        try {
          // Refetch reactions for this post from API to stay in sync
          const newReactions = await reactionsApi.getReactionsByPostId(post.id);
          setLocalReactions(newReactions);
          const currentUserReaction = newReactions.find(
            (r) => String(r.userId) === String(user?.id)
          );
          setReactionOfCurrentUser(currentUserReaction?.emotionType as EmotionType | undefined ?? null);
        } catch (err) {
          console.error("Failed to refetch reactions", err);
        }
      }
    };
    window.addEventListener('reaction-updated', handler as EventListener);
    return () => window.removeEventListener('reaction-updated', handler as EventListener);
  }, [post.id, user?.id]);
  useEffect(() => {
    return () => {
      if (hideReactionBarTimeoutRef.current) {
        clearTimeout(hideReactionBarTimeoutRef.current);
      }
      if (showReactionBarTimeoutRef.current) {
        clearTimeout(showReactionBarTimeoutRef.current);
      }
    };
  }, []);
  const updateReactionBarPosition = () => {
    const btn = likeButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const barWidth = 220;
    const top = rect.top - 48;
    const left = rect.left + rect.width / 2 - barWidth / 2;
    setPortalPos({ top: Math.max(8, top), left: Math.max(8, left) });
  };

  useEffect(() => {
    if (!showReactionBar) return;
    updateReactionBarPosition();
    const onScrollOrResize = () => updateReactionBarPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showReactionBar]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: 'post'; targetId: string };
      if (detail && detail.targetType === 'post' && detail.targetId === post.id) {
        setCommentCount((c) => c + 1);
      }
    };
    window.addEventListener('comment-updated', handler as EventListener);
    return () => window.removeEventListener('comment-updated', handler as EventListener);
  }, [post.id]);

  if (isDeleting) {
    return (
      <>
        <NotificationPopup
          notification={notification}
          onClose={hideNotification}
        />
      </>
    );
  }

  if (!post) {
    return (
      <div className="bg-white rounded-2xl shadow overflow-hidden p-4">
        <p className="text-gray-500">Bài viết không tồn tại</p>
      </div>
    );
  }
  const isOwner = user?.id === post.author?.id;
  const canDeletePost = isOwner || isAdmin;
  const formatTimeAgo = (dateString: string | number[] | null | undefined) => {
    if (!dateString) return "Vừa xong";

    let date: Date;

    if (Array.isArray(dateString)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateString;
      date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    } else if (typeof dateString === "string") {
      date = new Date(dateString);
    } else {
      return "Vừa xong";
    }

    if (isNaN(date.getTime())) {
      console.warn("[PostCard] Invalid date:", dateString);
      return "Vừa xong";
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 0) return "Trong tương lai";
    if (diffInSeconds < 60) return "Vừa xong";
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} tuần trước`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} năm trước`;
  };
  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "open":
        return (
          <FontAwesomeIcon
            icon={["fas", "earth-asia"]}
            className="text-gray-500"
          />
        );
      case "friends":
        return (
          <FontAwesomeIcon
            icon={["fas", "user-group"]}
            className="text-gray-500"
          />
        );
      case "only_me":
        return (
          <FontAwesomeIcon icon={["fas", "lock"]} className="text-gray-500" />
        );
      default:
        return (
          <FontAwesomeIcon
            icon={["fas", "earth-asia"]}
            className="text-gray-500"
          />
        );
    }
  };
  const getPrivacyText = (privacy: string) => {
    switch (privacy) {
      case "open":
        return "Công khai";
      case "friends":
        return "Bạn bè";
      case "only_me":
        return "Chỉ mình tôi";
      default:
        return "Công khai";
    }
  };
  // Removed updateReactionsInCache since we use localReactions

  const handleReactionSelect = async (emotion: EmotionType) => {
    if (!user?.id) return;
    try {
      if (reactionOfCurrentUser === emotion) {
        await reactionsApi.deletePostReaction(post.id, { userId: user.id });
        setReactionOfCurrentUser(null);
        setLocalReactions((reactions) =>
          reactions.filter((r) => String(r.userId) !== String(user.id))
        );
      } else {
        const newReaction = await reactionsApi.createOrUpdatePostReaction(post.id, {
          userId: user.id,
          emotionType: emotion,
        });
        setReactionOfCurrentUser(emotion);
        setLocalReactions((reactions) => {
          const withoutCurrent = reactions.filter(
            (r) => String(r.userId) !== String(user.id)
          );
          return [...withoutCurrent, newReaction as Reaction];
        });
      }
      window.dispatchEvent(
        new CustomEvent("reaction-updated", {
          detail: { targetType: "post", targetId: post.id },
        })
      );
    } catch (err) {
      console.error("Failed to handle reaction:", err);
    } finally {
      setShowReactionBar(false);
    }
  };
  const reactionIcons: Record<EmotionType | "like", string> = {
    like: likeIcon,
    love: loveIcon,
    haha: hahaIcon,
    wow: wowIcon,
    sad: sadIcon,
    angry: angryIcon,
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarWithModal
                src={post.author?.avatar}
                userId={post.author?.id}
                authorName={post.author?.name || "User"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">
                  {post.author?.name || "Người dùng"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">
                      {getPrivacyIcon(post.privacy)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getPrivacyText(post.privacy)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {(isOwner || isAdmin) && (
              <div className="relative">
                <button
                  ref={actionsButtonRef}
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FontAwesomeIcon icon={["fas", "ellipsis-vertical"]} />
                </button>
                {showActions && (
                  <div
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
                    style={{
                      top: actionsButtonRef.current
                        ? actionsButtonRef.current.getBoundingClientRect()
                            .bottom + 5
                        : "60px",
                      right: actionsButtonRef.current
                        ? window.innerWidth -
                          actionsButtonRef.current.getBoundingClientRect().right
                        : "20px",
                    }}
                  >
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setShowEditModal(true);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={["far", "pen-to-square"]} />
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/post/${post.id}`);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={["far", "eye"]} />
                          Xem chi tiết
                        </button>
                      </>
                    )}
                    {canDeletePost && (
                      <button
                        onClick={() => {
                          setShowDeleteDialog(true);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={["fas", "trash"]} />
                        {isAdmin && !isOwner ? "Xóa bài viết (Admin)" : "Xóa bài viết"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
            {(() => {
              const firstUrl = getFirstUrl(post.content);
              if (firstUrl && !post.image && !post.images && !post.video && !post.videos) {
                return post.content.replace(firstUrl, '').trim();
              }
              return post.content;
            })()}
          </p>
        </div>
        {(() => {
          const firstUrl = getFirstUrl(post.content);
          if (firstUrl && !post.image && !post.images && !post.video && !post.videos) {
            return (
              <div className="px-4 pb-3">
                <LinkPreview url={firstUrl} />
              </div>
            );
          }

          return null;
        })()}
        {(post.image || post.images) && (
          <div
            className="bg-gray-100 p-1 cursor-pointer hover:bg-gray-200 transition-colors relative group rounded-none overflow-hidden"
            onClick={() => {
                setInitialMediaIndex(0);
                setShowPhotoViewer(true);
            }}
            title="Click để xem chi tiết"
          >
            <ModernPhotoGrid
              images={post.images || [post.image!]}
              className="max-h-96 w-full"
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <FontAwesomeIcon icon={["fas", "expand"]} />
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              Click để xem chi tiết
            </div>
          </div>
        )}
        {(post.video || post.videos) && (
          <div
            className="bg-gray-100 p-1 cursor-pointer hover:bg-gray-200 transition-colors relative group rounded-none"
            onClick={() => setShowComments(true)}
            title="Click để xem chi tiết"
          >
            {(post.videos || []).map((videoUrl, index) => (
              <video
                key={index}
                src={videoUrl}
                controls
                className="w-full max-h-96 rounded-none"
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              >
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            ))}
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <FontAwesomeIcon icon={["fas", "expand"]} />
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              Click để xem chi tiết
            </div>
          </div>
        )}
        {post.documents && post.documents.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Tệp đính kèm</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {post.documents.map((doc, index) => {
                const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  try {
                    const response = await fetch(doc.url);
                    const blob = await response.blob();
                    
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = doc.name || `document_${index + 1}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Error downloading file:', error);
                    window.open(doc.url, '_blank');
                  }
                };

                return (
                  <a
                    key={doc.id || index}
                    href={doc.url}
                    onClick={handleDownload}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                  >
                    <FontAwesomeIcon 
                      icon={["fas", "file"]} 
                      className="text-2xl text-gray-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.name || `Tệp ${index + 1}`}
                      </p>
                      {doc.size && doc.size > 0 && (
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                    <FontAwesomeIcon 
                      icon={["fas", "download"]} 
                      className="text-gray-400 flex-shrink-0"
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}
        {/* Reactions + Comment total row */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <ReactionCounts
              postId={post.id}
              reactions={localReactions}
              onOpenReactionsModal={() => setShowReactionsModal(true)}
              className="px-0 py-0"
            />
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              aria-label="Xem tất cả bình luận"
            >
              <FontAwesomeIcon icon={["far", "comment"]} className="text-base" />
              <span className="text-sm font-medium">{commentCount}</span>
            </button>
          </div>
        </div>
        <div className="p-4 flex justify-between text-sm text-gray-600">
          <div
            className="relative"
            onMouseEnter={() => {
              if (hideReactionBarTimeoutRef.current) {
                clearTimeout(hideReactionBarTimeoutRef.current);
                hideReactionBarTimeoutRef.current = null;
              }
              // Add a hover delay for feed reaction bar too
              showReactionBarTimeoutRef.current = window.setTimeout(() => {
                updateReactionBarPosition();
                setShowReactionBar(true);
              }, 500);
            }}
            onMouseLeave={() => {
              if (showReactionBarTimeoutRef.current) {
                clearTimeout(showReactionBarTimeoutRef.current);
              }
              hideReactionBarTimeoutRef.current = window.setTimeout(() => {
                setShowReactionBar(false);
                hideReactionBarTimeoutRef.current = null;
              }, 500);
            }}
          >
            <button
              ref={likeButtonRef}
              onClick={async () => {
                await handleReactionSelect("like");
              }}
              className={`transition-colors flex items-center gap-1 ${
                reactionOfCurrentUser ? "font-semibold" : "hover:text-blue-600"
              }`}
            >
              {reactionOfCurrentUser ? (
                <img
                  src={reactionIcons[reactionOfCurrentUser]}
                  alt={reactionOfCurrentUser}
                  width={20}
                  height={20}
                />
              ) : (
                <FontAwesomeIcon icon={["far", "thumbs-up"]} />
              )}

              {reactionOfCurrentUser
                ? reactionOfCurrentUser?.charAt(0).toUpperCase() +
                  reactionOfCurrentUser?.slice(1)
                : "Like"}
            </button>

            {showReactionBar &&
              portalPos &&
              createPortal(
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
                  onMouseLeave={() => {
                    hideReactionBarTimeoutRef.current = window.setTimeout(
                      () => {
                        setShowReactionBar(false);
                        hideReactionBarTimeoutRef.current = null;
                      },
                      200
                    );
                  }}
                >
                  <ReactionBar onSelect={handleReactionSelect} />
                </div>,
                document.body
              )}
          </div>
          <button
            onClick={() => setShowComments(true)}
            className="hover:text-blue-600 transition-colors"
          >
            <FontAwesomeIcon icon={["far", "comment"]} /> Bình luận
          </button>
          <button className="hover:text-blue-600 transition-colors">
            <FontAwesomeIcon icon={["far", "share-from-square"]} /> Chia sẻ
          </button>
        </div>
      </div>
      <PhotoViewerModal
        post={post}
        isOpen={showPhotoViewer}
        onClose={() => setShowPhotoViewer(false)}
        initialMediaIndex={initialMediaIndex}
      />
      <PostDetailModal
        post={post}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
      <EditPostModal
        post={post}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handlePostUpdated}
      />
      <DeleteConfirmDialog
        post={post}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={() => handlePostDeleted(post.id)}
        onError={handleDeleteError}
      />
      <PrivacySettings
        post={post}
        isOpen={showPrivacySettings}
        onSuccess={handlePostUpdated}
        onClose={() => setShowPrivacySettings(false)}
      />
      <ReactionsModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        target={{ type: "post", id: post.id }}
      />

      <NotificationPopup
        notification={notification}
        onClose={hideNotification}
      />
    </>
  );
}
