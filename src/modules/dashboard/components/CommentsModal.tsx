import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  getCommentsByPost,
  createComment,
  createReply,
  deleteComment,
  deleteReply,
  updateComment,
  updateReply,
} from "../../../services/commentsApi";
import { BASE_URL } from "../../../services/api";
import defaultAvatar from "../../../assets/default-avatar.png";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";
import LinkPreview from "../../../components/LinkPreview";
import { getFirstUrl } from "../../../utils/linkUtils";

import type {
  Comment as ApiComment,
  ReplyComment as ApiReply,
} from "../../../types/post";
import reactionsApi, { type EmotionType } from "../../../services/reactionsApi";
import type { Reaction } from "../../../types/post";
import ReactionBar from "./ReactionBar";
import { createPortal } from "react-dom";
import UserAvatar from "../../../components/UserAvatar";
import likeIcon from "../../../assets/like.svg";
import loveIcon from "../../../assets/love.svg";
import hahaIcon from "../../../assets/haha.svg";
import wowIcon from "../../../assets/wow.svg";
import sadIcon from "../../../assets/sad.svg";
import angryIcon from "../../../assets/angry.svg";
import CommentsSkeleton from "./CommentsSkeleton";
import { useIsAdminSimple } from "../../../utils/useIsAdmin";
import { useNotification } from "../../../hooks/useNotification";
import NotificationPopup from "../../../components/NotificationPopup";

type MediaFile = {
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
};

type UiReply = {
  id: string;
  authorName?: string;
  authorId?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  mediaFiles?: MediaFile[];
};

type UiComment = {
  id: string;
  authorName: string;
  authorId?: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  replies: Array<UiReply>;
  mediaFiles?: MediaFile[];
};

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postOwnerId?: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  isSidebarMode?: boolean;
}

export default function CommentsModal({
  isOpen,
  onClose,
  postId,
  postOwnerId,
  onCommentAdded,
  onCommentDeleted,
  isSidebarMode = false,
}: CommentsModalProps) {
  const normalizeApiUrl = (url?: string | null) => {
    if (!url) return url ?? undefined;
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return `${BASE_URL.replace(/\/$/, "")}${url}`;
    return url;
  };

  const getLocalAvatarUrl = (userId?: string | null): string => {
    if (!userId) return defaultAvatar;
    const cachedAvatar = localStorage.getItem(`avatar_url_${userId}`);
    if (cachedAvatar) {
      if (cachedAvatar.startsWith("http")) return cachedAvatar;
      if (cachedAvatar.startsWith("/uploads"))
        return `${BASE_URL}${cachedAvatar}`;
      return cachedAvatar;
    }
    return defaultAvatar;
  };

  const [comments, setComments] = useState<UiComment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdmin = useIsAdminSimple();
  const { notification, showSuccess, showApiError, hideNotification } = useNotification();

  const [newCommentFile, setNewCommentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyFiles, setReplyFiles] = useState<Record<string, File | null>>({});
  const [replyPreviewUrls, setReplyPreviewUrls] = useState<
    Record<string, string | null>
  >({});

  const [commentReactions, setCommentReactions] = useState<
    Record<
      string,
      { counts: Record<EmotionType, number>; myReaction: EmotionType | null }
    >
  >({});
  const [replyReactions, setReplyReactions] = useState<
    Record<
      string,
      { counts: Record<EmotionType, number>; myReaction: EmotionType | null }
    >
  >({});

  const [showReactionBarFor, setShowReactionBarFor] = useState<{
    type: "comment" | "reply";
    id: string;
  } | null>(null);
  const showReactionBarTimeoutRef = useRef<number | null>(null);
  const hideReactionBarTimeoutRef = useRef<number | null>(null);

  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] =
    useState<string>("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState<string>("");

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );
    if (diffInMinutes < 1) return "Vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    if (!isOpen) return;
    setComments(null);
    (async () => {
      try {
        console.log("[CommentsModal] Fetching comments for post:", postId);
        const list = await getCommentsByPost(postId);
        console.log("[CommentsModal] Received comments:", list);

        if (!Array.isArray(list)) {
          console.error("[CommentsModal] Comments is not an array:", list);
          setComments([]);
          return;
        }

        const commentReactionsMap: Record<
          string,
          {
            counts: Record<EmotionType, number>;
            myReaction: EmotionType | null;
          }
        > = {};
        const replyReactionsMap: Record<
          string,
          {
            counts: Record<EmotionType, number>;
            myReaction: EmotionType | null;
          }
        > = {};

        const mapped: UiComment[] = await Promise.all(
          (list || []).map(async (c: ApiComment) => {
            let authorAvatar = defaultAvatar;
            if (c.userAvatar && c.userAvatar.trim() !== "") {
              if (c.userAvatar.startsWith("http")) authorAvatar = c.userAvatar;
              else if (c.userAvatar.startsWith("/uploads"))
                authorAvatar = `${BASE_URL}${c.userAvatar}`;
              else authorAvatar = c.userAvatar;
            }

            const replies: UiReply[] = await Promise.all(
              (c.replyComments || []).map(async (r: ApiReply) => {
                let replyAvatar = defaultAvatar;
                if (r.userAvatar && r.userAvatar.trim() !== "") {
                  if (r.userAvatar.startsWith("http"))
                    replyAvatar = r.userAvatar;
                  else if (r.userAvatar.startsWith("/uploads"))
                    replyAvatar = `${BASE_URL}${r.userAvatar}`;
                  else replyAvatar = r.userAvatar;
                }

                const reply: UiReply = {
                  id: String(r.id),
                  authorName: r.fullName || r.username || undefined,
                  authorId: r.userId ? String(r.userId) : undefined,
                  authorAvatar: replyAvatar,
                  content: r.content,
                  createdAt: r.createdAt,
                  mediaFiles: (r as any).files?.map((f: any) => ({
                    fileUrl: normalizeApiUrl(f.fileUrl) ?? "",
                    fileType: f.fileType as "IMAGE" | "VIDEO",
                  })),
                };

                try {
                  const rr = await reactionsApi.getReactionsByReplyId(
                    String(r.id)
                  );
                  const counts: Record<EmotionType, number> = {
                    like: 0,
                    love: 0,
                    haha: 0,
                    wow: 0,
                    sad: 0,
                    angry: 0,
                  };
                  if (Array.isArray(rr)) {
                    rr.forEach(
                      (re) =>
                        re.emotionType && counts[re.emotionType as EmotionType]++
                    );
                  }
                  const myReaction = user?.id && Array.isArray(rr)
                    ? (rr.find((x) => String(x.userId) === String(user.id))
                        ?.emotionType as EmotionType | undefined) ?? null
                    : null;
                  replyReactionsMap[String(r.id)] = { counts, myReaction };
                } catch {
                  replyReactionsMap[String(r.id)] = {
                    counts: {
                      like: 0,
                      love: 0,
                      haha: 0,
                      wow: 0,
                      sad: 0,
                      angry: 0,
                    },
                    myReaction: null,
                  };
                }
                return reply;
              })
            );

            try {
              const cr = await reactionsApi.getReactionsByCommentId(
                String(c.id)
              );
              const counts: Record<EmotionType, number> = {
                like: 0,
                love: 0,
                haha: 0,
                wow: 0,
                sad: 0,
                angry: 0,
              };
              if (Array.isArray(cr)) {
                cr.forEach(
                  (re) =>
                    re.emotionType && counts[re.emotionType as EmotionType]++
                );
              }
              const myReaction = user?.id && Array.isArray(cr)
                ? (cr.find((x) => String(x.userId) === String(user.id))
                    ?.emotionType as EmotionType | undefined) ?? null
                : null;
              commentReactionsMap[String(c.id)] = { counts, myReaction };
            } catch {
              commentReactionsMap[String(c.id)] = {
                counts: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
                myReaction: null,
              };
            }

            return {
              id: String(c.id),
              authorName: c.fullName || c.username || "Người dùng",
              authorId: String(c.userId || ""),
              authorAvatar,
              content: c.content,
              createdAt: c.createdAt,
              replies,
              mediaFiles: c.files?.map((f) => ({
                fileUrl: normalizeApiUrl(f.fileUrl) ?? "",
                fileType: f.fileType as "IMAGE" | "VIDEO",
              })),
            };
          })
        );

        console.log("[CommentsModal] Mapped comments:", mapped);
        
        await delay(1000);

        setComments(mapped);
        setCommentReactions(commentReactionsMap);
        setReplyReactions(replyReactionsMap);
      } catch (e) {
        console.error("[CommentsModal] Failed to load comments", e);
        setComments([]);
      }
    })();
  }, [isOpen, postId, user?.id]);

  const handlePostComment = async () => {
    const content = newComment.trim();
    if (!content && !newCommentFile) return;
    try {
      const c = await createComment(postId, {
        content,
        file: newCommentFile || undefined,
      });
      const added: UiComment = {
        id: String(c.id),
        authorName: c.fullName || c.username || user?.username || "Bạn",
        authorAvatar: getLocalAvatarUrl(user?.id),
        authorId: user?.id,
        content: c.content,
        createdAt: c.createdAt,
        replies: [],
        mediaFiles: c.files?.map((f) => ({
          fileUrl: normalizeApiUrl(f.fileUrl) ?? "",
          fileType: f.fileType as "IMAGE" | "VIDEO",
        })),
      };
      setComments((prev) => [added, ...(prev || [])]);
      setCommentReactions((prev) => ({
        ...prev,
        [c.id]: {
          counts: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
          myReaction: null,
        },
      }));
      setNewComment("");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setNewCommentFile(null);
      
      // Notify parent component to update comment count
      if (onCommentAdded) {
        onCommentAdded();
      }
      window.dispatchEvent(
        new CustomEvent("comment-updated", {
          detail: { targetType: "post", targetId: postId, action: "add" },
        })
      );

      showSuccess("Đăng bình luận thành công", "Bình luận của bạn đã được đăng.");
    } catch (e) {
      console.error("Failed to create comment", e);
      showApiError(
        e,
        "Không thể đăng bình luận. Vui lòng thử lại.",
        "Lỗi bình luận"
      );
    }
  };

  const handlePostReply = async (commentId: string) => {
    const content = (replyDrafts[commentId] || "").trim();
    const file = replyFiles[commentId] || undefined;
    if (!content && !file) return;
    try {
      const r = await createReply(commentId, { content, file });
      setComments((prev) =>
        (prev || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [
                  {
                    id: String(r.id),
                    authorName: r.fullName || r.username || user?.username || "Bạn",
                    authorId: user?.id,
                    authorAvatar: getLocalAvatarUrl(user?.id),
                    content: r.content,
                    createdAt: r.createdAt,
                    mediaFiles: r.files?.map((f: any) => ({
                      fileUrl: normalizeApiUrl(f.fileUrl) ?? "",
                      fileType: f.fileType as "IMAGE" | "VIDEO",
                    })),
                  },
                  ...(c.replies ?? []),
                ],
              }
            : c
        )
      );
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setReplyFiles((prev) => ({ ...prev, [commentId]: null }));
      if (replyPreviewUrls[commentId])
        URL.revokeObjectURL(replyPreviewUrls[commentId]!);
      setReplyPreviewUrls((prev) => ({ ...prev, [commentId]: null }));

      showSuccess("Đăng phản hồi thành công", "Phản hồi của bạn đã được đăng.");
    } catch (e) {
      console.error("Failed to create reply", e);
      showApiError(
        e,
        "Không thể đăng phản hồi. Vui lòng thử lại.",
        "Lỗi phản hồi"
      );
    }
  };

  const handleStartEditComment = (
    commentId: string,
    currentContent: string
  ) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
    setEditingReplyId(null);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleSaveEditComment = async (commentId: string) => {
    const content = editingCommentContent.trim();
    if (!content || !user?.id) return;

    try {
      const updatedApiComment = await updateComment(commentId, {
        userId: user.id,
        content,
      });
      setComments((prev) =>
        (prev || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                content: updatedApiComment.content,
                createdAt: new Date().toISOString(),
              }
            : c
        )
      );
      handleCancelEditComment();
      showSuccess("Thành công", "Đã cập nhật bình luận");
    } catch (e) {
      console.error("Failed to update comment", e);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    try {
      await deleteComment(commentId, user.id);
      setComments((prev) => (prev || []).filter((c) => c.id !== commentId));
      setCommentReactions((prev) => {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      });
      
      // Notify parent component to update comment count
      if (onCommentDeleted) {
        onCommentDeleted();
      }
      window.dispatchEvent(
        new CustomEvent("comment-updated", {
          detail: { targetType: "post", targetId: postId, action: "delete" },
        })
      );
      showSuccess("Thành công", "Đã xóa bình luận");
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  const handleStartEditReply = (replyId: string, currentContent: string) => {
    setEditingReplyId(replyId);
    setEditingReplyContent(currentContent);
    setEditingCommentId(null);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyContent("");
  };

  const handleSaveEditReply = async (commentId: string, replyId: string) => {
    const content = editingReplyContent.trim();
    if (!content) return;

    try {
      const updatedApiReply = await updateReply(replyId, { content });
      setComments((prev) =>
        (prev || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies ?? []).map((r) =>
                  r.id === replyId
                    ? {
                        ...r,
                        content: updatedApiReply.content,
                        createdAt: new Date().toISOString(),
                      }
                    : r
                ),
              }
            : c
        )
      );
      handleCancelEditReply();
      showSuccess("Thành công", "Đã cập nhật phản hồi");
    } catch (e) {
      console.error("Failed to update reply", e);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      await deleteReply(replyId);
      setComments((prev) =>
        (prev || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies ?? []).filter((r) => r.id !== replyId),
              }
            : c
        )
      );
      setReplyReactions((prev) => {
        const newState = { ...prev };
        delete newState[replyId];
        return newState;
      });
      showSuccess("Thành công", "Đã xóa phản hồi");
    } catch (e) {
      console.error("Failed to delete reply", e);
    }
  };

  const computeCountsAndMy = (
    list: Reaction[] | null
  ): {
    counts: Record<EmotionType, number>;
    myReaction: EmotionType | null;
  } => {
    const counts: Record<EmotionType, number> = {
      like: 0,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };
    if (!list) return { counts, myReaction: null };
    list.forEach((r) => {
      if (r.emotionType && r.emotionType in counts)
        counts[r.emotionType as EmotionType]++;
    });
    const myReaction = user?.id
      ? (list.find((x) => String(x.userId) === String(user.id))?.emotionType as
          | EmotionType
          | undefined) ?? null
      : null;
    return { counts, myReaction };
  };

  const handleCommentReactionSelect = async (
    commentId: string,
    emotion: EmotionType
  ) => {
    if (!user?.id) return;
    const current = commentReactions[commentId]?.myReaction ?? null;
    try {
      if (current === emotion) {
        await reactionsApi.deleteCommentReaction(commentId, {
          userId: String(user.id),
        });
      } else {
        await reactionsApi.createOrUpdateCommentReaction(commentId, {
          userId: String(user.id),
          emotionType: emotion,
        });
      }
      const list = await reactionsApi.getReactionsByCommentId(commentId);
      const { counts, myReaction } = computeCountsAndMy(list);
      setCommentReactions((prev) => ({
        ...prev,
        [commentId]: { counts, myReaction },
      }));
      window.dispatchEvent(
        new CustomEvent("reaction-updated", {
          detail: { targetType: "comment", targetId: commentId },
        })
      );
    } catch (err) {
      console.error("Failed to update comment reaction:", err);
    } finally {
      setShowReactionBarFor(null);
      setPortalPos(null);
    }
  };

  const handleReplyReactionSelect = async (
    replyId: string,
    emotion: EmotionType
  ) => {
    if (!user?.id) return;
    const current = replyReactions[replyId]?.myReaction ?? null;
    try {
      if (current === emotion) {
        await reactionsApi.deleteReplyReaction(replyId, {
          userId: String(user.id),
        });
      } else {
        await reactionsApi.createOrUpdateReplyReaction(replyId, {
          userId: String(user.id),
          emotionType: emotion,
        });
      }
      const list = await reactionsApi.getReactionsByReplyId(replyId);
      const { counts, myReaction } = computeCountsAndMy(list);
      setReplyReactions((prev) => ({
        ...prev,
        [replyId]: { counts, myReaction },
      }));
      window.dispatchEvent(
        new CustomEvent("reaction-updated", {
          detail: { targetType: "reply", targetId: replyId },
        })
      );
    } catch (err) {
      console.error("Failed to update reply reaction:", err);
    } finally {
      setShowReactionBarFor(null);
      setPortalPos(null);
    }
  };

  const showReactionBar = (
    type: "comment" | "reply",
    id: string,
    btnEl?: HTMLElement | null
  ) => {
    if (hideReactionBarTimeoutRef.current) {
      window.clearTimeout(hideReactionBarTimeoutRef.current);
      hideReactionBarTimeoutRef.current = null;
    }
    if (showReactionBarTimeoutRef.current) {
      window.clearTimeout(showReactionBarTimeoutRef.current);
    }
    showReactionBarTimeoutRef.current = window.setTimeout(() => {
      setShowReactionBarFor({ type, id });

      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        const barWidth = 220;
        const top = rect.top - 48;
        const left = rect.left + rect.width / 2 - barWidth / 2;
        setPortalPos({ top: Math.max(8, top), left: Math.max(8, left) });
      } else {
        setPortalPos(null);
      }
    }, 500); // 500ms delay like Facebook
  };

  const hideReactionBar = () => {
    if (showReactionBarTimeoutRef.current) {
      window.clearTimeout(showReactionBarTimeoutRef.current);
      showReactionBarTimeoutRef.current = null;
    }
    if (hideReactionBarTimeoutRef.current)
      window.clearTimeout(hideReactionBarTimeoutRef.current);
    hideReactionBarTimeoutRef.current = window.setTimeout(() => {
      setShowReactionBarFor(null);
      setPortalPos(null);
    }, 250);
  };

  return (
    <>
      <div className={`mt-2 border-t border-gray-100 ${isSidebarMode ? 'flex-1 flex flex-col justify-between' : ''} ${isOpen ? 'block' : 'hidden'}`}>
        <div className={`flex flex-col ${isSidebarMode ? 'flex-1 justify-between' : ''}`}>
          <div className={`px-4 py-3 space-y-4 ${isSidebarMode ? '' : 'max-h-[60vh] overflow-y-auto custom-scrollbar'}`}>
            {comments === null ? (
              <CommentsSkeleton />
            ) : comments.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <p>Chưa có bình luận nào</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  level={0}
                  replyDraft={replyDrafts[comment.id] || ""}
                  isReplying={activeReplyId === comment.id}
                  onReplyDraftChange={(v) =>
                    setReplyDrafts((prev) => ({ ...prev, [comment.id]: v }))
                  }
                  onToggleReply={() =>
                    setActiveReplyId((prev) =>
                      prev === comment.id ? null : comment.id
                    )
                  }
                  onSendReply={() => handlePostReply(comment.id)}
                  replyFile={replyFiles[comment.id] ?? null}
                  replyPreviewUrl={replyPreviewUrls[comment.id] ?? null}
                  onReplyFileChange={(file) =>
                    setReplyFiles((prev) => ({ ...prev, [comment.id]: file }))
                  }
                  onReplyPreviewUrlChange={(url) =>
                    setReplyPreviewUrls((prev) => ({
                      ...prev,
                      [comment.id]: url,
                    }))
                  }
                  formatTimeAgo={formatTimeAgo}
                  commentReactionData={
                    commentReactions[comment.id] ?? {
                      counts: {
                        like: 0,
                        love: 0,
                        haha: 0,
                        wow: 0,
                        sad: 0,
                        angry: 0,
                      },
                      myReaction: null,
                    }
                  }
                  replyReactionData={replyReactions}
                  showReactionBarFor={showReactionBarFor}
                  showReactionBar={showReactionBar}
                  hideReactionBar={hideReactionBar}
                  onSelectCommentReaction={handleCommentReactionSelect}
                  onSelectReplyReaction={handleReplyReactionSelect}
                  isMyComment={user?.id === comment.authorId}
                  isEditingComment={editingCommentId === comment.id}
                  editingCommentContent={
                    editingCommentId === comment.id ? editingCommentContent : ""
                  }
                  onStartEditComment={handleStartEditComment}
                  onCancelEditComment={handleCancelEditComment}
                  onSaveEditComment={() => handleSaveEditComment(comment.id)}
                  onEditingCommentContentChange={setEditingCommentContent}
                  onDeleteComment={() => handleDeleteComment(comment.id)}
                  editingReplyId={editingReplyId}
                  editingReplyContent={editingReplyContent}
                  onStartEditReply={handleStartEditReply}
                  onCancelEditReply={handleCancelEditReply}
                  onSaveEditReply={(replyId) =>
                    handleSaveEditReply(comment.id, replyId)
                  }
                  onEditingReplyContentChange={setEditingReplyContent}
                  onDeleteReply={(replyId) =>
                    handleDeleteReply(comment.id, replyId)
                  }
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  postOwnerId={postOwnerId}
                />
              ))
            )}
          </div>

          <div className="sticky bottom-0 border-t px-6 py-4 bg-gray-50 z-10">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={(() => {
                  if (!user?.id) return defaultAvatar;
                  const cachedAvatar = localStorage.getItem(
                    `avatar_url_${user.id}`
                  );
                  if (cachedAvatar) {
                    if (cachedAvatar.startsWith("http")) return cachedAvatar;
                    if (cachedAvatar.startsWith("/uploads"))
                      return `${BASE_URL}${cachedAvatar}`;
                    return cachedAvatar;
                  }
                  return defaultAvatar;
                })()}
                size="md"
                userId={user?.id || ""}
              />

              <div className="flex-1 flex flex-col">
                {previewUrl && (
                  <div className="relative w-32 h-32 rounded-lg border object-cover">
                    {newCommentFile?.type.startsWith("video/") ? (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full h-full rounded-lg border object-cover"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="w-full h-full rounded-lg border object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setNewCommentFile(null);
                      }}
                      className="absolute top-0 right-0 m-1 p-1 bg-gray-800 bg-opacity-75 text-white rounded-full hover:bg-red-500 text-xs z-10"
                      title="Xóa"
                    >
                      <FontAwesomeIcon icon={["fas", "xmark"]} />
                    </button>
                  </div>
                )}

                <div className="flex-1 flex items-center gap-3 bg-white border rounded-xl px-4 py-2 shadow-sm">
                  <textarea
                    ref={(el) => {
                      if (el && newComment === "") el.style.height = "40px";
                    }}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Viết bình luận..."
                    className="flex-1 outline-none text-sm resize-none overflow-y-auto min-h-[40px] max-h-[200px]"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      const lineHeight = 24;
                      const maxHeight = lineHeight * 5;
                      target.style.height =
                        Math.min(target.scrollHeight, maxHeight) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePostComment();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="text-gray-500 hover:text-yellow-500 text-lg"
                    title="Biểu cảm"
                  >
                    <FontAwesomeIcon icon={["far", "face-smile"]} />
                  </button>

                  <label
                    htmlFor="comment-file-input"
                    className="cursor-pointer text-gray-500 hover:text-blue-600"
                  >
                    <FontAwesomeIcon icon={["fas", "image"]} />
                  </label>
                  <input
                    type="file"
                    id="comment-file-input"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (previewUrl) {
                          try {
                            URL.revokeObjectURL(previewUrl);
                          } catch (err) {}
                        }
                        setNewCommentFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                  />

                  {(newComment.trim() || newCommentFile) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePostComment();
                      }}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={["fas", "paper-plane"]} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NotificationPopup notification={notification} onClose={hideNotification} />

      {showReactionBarFor &&
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
                window.clearTimeout(hideReactionBarTimeoutRef.current);
                hideReactionBarTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              hideReactionBar();
            }}
          >
            <ReactionBar
              onSelect={(e) => {
                if (!showReactionBarFor) return;
                if (showReactionBarFor.type === "comment") {
                  handleCommentReactionSelect(showReactionBarFor.id, e);
                } else {
                  handleReplyReactionSelect(showReactionBarFor.id, e);
                }
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}

interface CommentItemProps {
  comment: UiComment;
  level: number;
  replyDraft: string;
  isReplying: boolean;
  onReplyDraftChange: (v: string) => void;
  onToggleReply: () => void;
  onSendReply: () => void;
  formatTimeAgo: (d: string) => string;
  commentReactionData: {
    counts: Record<EmotionType, number>;
    myReaction: EmotionType | null;
  };
  replyReactionData: Record<
    string,
    { counts: Record<EmotionType, number>; myReaction: EmotionType | null }
  >;
  showReactionBarFor: { type: "comment" | "reply"; id: string } | null;
  showReactionBar: (
    type: "comment" | "reply",
    id: string,
    btnEl?: HTMLElement | null
  ) => void;
  hideReactionBar: () => void;
  onSelectCommentReaction: (id: string, e: EmotionType) => void;
  onSelectReplyReaction: (id: string, e: EmotionType) => void;
  isMyComment: boolean;
  isEditingComment: boolean;
  editingCommentContent: string;
  onStartEditComment: (commentId: string, currentContent: string) => void;
  onCancelEditComment: () => void;
  onSaveEditComment: () => void;
  onEditingCommentContentChange: (content: string) => void;
  onDeleteComment: () => void;
  editingReplyId: string | null;
  editingReplyContent: string;
  onStartEditReply: (replyId: string, currentContent: string) => void;
  onCancelEditReply: () => void;
  onSaveEditReply: (replyId: string) => void;
  onEditingReplyContentChange: (content: string) => void;
  onDeleteReply: (replyId: string) => void;
  currentUserId: string | undefined;
  replyFile?: File | null;
  replyPreviewUrl?: string | null;
  onReplyFileChange?: (file: File | null) => void;
  onReplyPreviewUrlChange?: (url: string | null) => void;
  isAdmin?: boolean;
  postOwnerId?: string;
}

function CommentItem({
  comment,
  level,
  replyDraft,
  isReplying,
  onReplyDraftChange,
  onToggleReply,
  onSendReply,
  formatTimeAgo,
  commentReactionData,
  replyReactionData,
  showReactionBar,
  hideReactionBar,
  onSelectCommentReaction,
  onSelectReplyReaction,
  isMyComment,
  isEditingComment,
  editingCommentContent,
  onStartEditComment,
  onCancelEditComment,
  onSaveEditComment,
  onEditingCommentContentChange,
  onDeleteComment,
  editingReplyId,
  editingReplyContent,
  onStartEditReply,
  onCancelEditReply,
  onSaveEditReply,
  onEditingReplyContentChange,
  onDeleteReply,
  currentUserId,
  replyFile,
  replyPreviewUrl,
  onReplyFileChange,
  onReplyPreviewUrlChange,
  isAdmin = false,
  postOwnerId,
}: CommentItemProps) {
  const totalCommentReactions = Object.values(
    commentReactionData.counts || {}
  ).reduce((a, b) => a + b, 0);
  const myCommentReaction = commentReactionData.myReaction;
  const likeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isCommentMenuOpen, setIsCommentMenuOpen] = useState(false);
  const [openReplyMenuId, setOpenReplyMenuId] = useState<string | null>(null);
  
  const canDeleteComment = isMyComment || isAdmin || (postOwnerId && currentUserId === postOwnerId);
  const handleCommentEdit = () => {
    setIsCommentMenuOpen(false);
    onStartEditComment(comment.id, comment.content);
  };

  const handleCommentDelete = () => {
    setIsCommentMenuOpen(false);
    onDeleteComment();
    showSuccess("Đã xóa bình luận");
  };

  const handleCommentSave = () => {
    onSaveEditComment();
    showSuccess("Đã cập nhật bình luận");
  };

  const handleReplyEdit = (replyId: string, currentContent: string) => {
    setOpenReplyMenuId(null);
    onStartEditReply(replyId, currentContent);
  };

  const handleReplySave = (replyId: string) => {
    onSaveEditReply(replyId);
    showSuccess("Đã cập nhật phản hồi");
  };

  const handleReplyDelete = (replyId: string) => {
    setOpenReplyMenuId(null);
    onDeleteReply(replyId);
    showSuccess("Đã xóa phản hồi");
  };

  const handleCommentEditKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleCommentSave();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onCancelEditComment();
    }
  };

  const handleReplyEditKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    replyId: string
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleReplySave(replyId);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onCancelEditReply();
    }
  };

  return (
    <div className={`flex gap-2 ${level > 0 ? "ml-12 mt-2" : "mt-4"}`}>
      <img
        src={comment.authorAvatar}
        alt={comment.authorName}
        className="w-8 h-8 rounded-full object-cover mt-1 shrink-0"
      />
      <div className="flex-1 relative min-w-0 flex flex-col items-start group">
        <div className="flex items-center gap-2 relative z-10 group w-max max-w-[85%]">
          <div className="bg-[#f0f2f5] rounded-[18px] px-3 py-2 max-w-full inline-block">
            <p className="font-semibold text-[13px] text-gray-900 leading-tight mb-1">{comment.authorName}</p>

          {isEditingComment ? (
            <div className="mt-1 flex items-center gap-2">
              <textarea
                value={editingCommentContent}
                onChange={(e) => onEditingCommentContentChange(e.target.value)}
                onKeyDown={handleCommentEditKeyDown}
                placeholder="Chỉnh sửa bình luận..."
                className="flex-1 outline-none text-sm border rounded-xl px-3 py-2 resize-none"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 120) + "px";
                }}
                autoFocus
              />
              <button
                onClick={onSaveEditComment}
                className="text-blue-600 hover:text-blue-700"
              >
                <FontAwesomeIcon icon={["fas", "check"]} />
              </button>
              <button
                onClick={onCancelEditComment}
                className="text-red-600 hover:text-red-700"
              >
                <FontAwesomeIcon icon={["fas", "xmark"]} />
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const firstUrl = getFirstUrl(comment.content);
                const hasMediaFiles = comment.mediaFiles && comment.mediaFiles.length > 0;
                const hasLink = !!firstUrl && !hasMediaFiles;
                
                return (
                  <>
                    <p className="text-[13px] text-gray-800 whitespace-pre-wrap break-words">
                      {hasLink && firstUrl ? comment.content.replace(firstUrl, '').trim() : comment.content}
                    </p>
                    {hasLink && firstUrl && (
                      <div className="mt-2">
                        <LinkPreview url={firstUrl} size="compact" lazy={false} />
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
          </div>

          {canDeleteComment && (
            <div className="absolute top-1/2 -translate-y-1/2 -right-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentMenuOpen((prev) => !prev);
                }}
              >
                <FontAwesomeIcon icon={["fas", "ellipsis"]} className="w-4 h-4" />
              </button>

              {isCommentMenuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden">
                  {isMyComment && (
                    <button
                      className="w-full text-left px-4 py-2 text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                      onClick={handleCommentEdit}
                    >
                      Chỉnh sửa
                    </button>
                  )}
                  <button
                    className="w-full text-left px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    onClick={handleCommentDelete}
                  >
                    {isAdmin && !isMyComment ? "Xoá (Admin)" : (postOwnerId && currentUserId === postOwnerId && !isMyComment ? "Xoá (Chủ bài viết)" : "Xoá")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media files under the bubble */}
        {comment.mediaFiles && comment.mediaFiles.length > 0 && (
          <div className="mt-1 space-y-2">
            {comment.mediaFiles.map((file, index) => (
              <div key={index} className="relative">
                {file.fileType === "IMAGE" && (
                  <img
                    src={file.fileUrl}
                    alt="Comment attachment"
                    className="max-w-[200px] h-auto rounded-lg object-cover border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.png";
                    }}
                  />
                )}
                {file.fileType === "VIDEO" && (
                  <video
                    src={file.fileUrl}
                    controls
                    className="max-w-[200px] rounded-lg border border-gray-200"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1 ml-3 text-[12px] font-bold text-[#65676b] relative z-0">
          <span className="font-normal cursor-pointer hover:underline">
            {formatTimeAgo(comment.createdAt)}
          </span>
          <div
            className="relative"
            onMouseEnter={() =>
              showReactionBar("comment", comment.id, likeBtnRef.current)
            }
            onMouseLeave={() => hideReactionBar()}
          >
            <button
              ref={likeBtnRef}
              className={`hover:underline flex items-center gap-1 ${
                myCommentReaction ? "text-blue-600" : ""
              }`}
              onClick={async () => {
                const targetEmotion: EmotionType = myCommentReaction || "like";
                await onSelectCommentReaction(comment.id, targetEmotion);
              }}
            >
              {myCommentReaction ? (
                <span>{capitalize(myCommentReaction)}</span>
              ) : (
                <span>Thích</span>
              )}
            </button>
          </div>
          <button className="hover:underline" onClick={onToggleReply}>
            Phản hồi
          </button>
          
          {totalCommentReactions > 0 && (
            <div className="flex items-center gap-1 cursor-pointer hover:underline text-[#65676b] font-normal ml-2">
              <div className="flex -space-x-1">
                {Object.entries(commentReactionData.counts || {})
                  .filter(([_, count]) => count > 0)
                  .map(([type, _]) => (
                    <img key={type} src={getReactionIcon(type as EmotionType)} alt={type} className="w-4 h-4 rounded-full border border-white" />
                  ))
                }
              </div>
              <span>{totalCommentReactions}</span>
            </div>
          )}
        </div>

        {isReplying &&
          (!editingReplyId ||
            !comment.replies.some((r) => r.id === editingReplyId)) && (
            <div className="mt-2 flex items-start gap-2 w-full">
              <div className="flex-1">
                {replyPreviewUrl && (
                  <div className="relative w-28 h-28 rounded-lg border mb-2">
                    {replyFile?.type?.startsWith("video/") ? (
                      <video
                        src={replyPreviewUrl}
                        controls
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      <img
                        src={replyPreviewUrl}
                        alt="preview"
                        className="w-full h-full rounded-lg object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (replyPreviewUrl) {
                          try {
                            URL.revokeObjectURL(replyPreviewUrl);
                          } catch (err) {}
                        }
                        onReplyFileChange?.(null);
                        onReplyPreviewUrlChange?.(null);
                      }}
                      className="absolute top-0 right-0 m-1 p-1 bg-gray-800 bg-opacity-75 text-white rounded-full hover:bg-red-500 text-xs z-10"
                      title="Xóa"
                    >
                      <FontAwesomeIcon icon={["fas", "xmark"]} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2 shadow-sm">
                  <textarea
                    ref={(el) => {
                      if (el && replyDraft === "") el.style.height = "40px";
                    }}
                    value={replyDraft}
                    onChange={(e) => onReplyDraftChange(e.target.value)}
                    placeholder="Viết phản hồi..."
                    className="flex-1 outline-none text-sm resize-none overflow-y-auto min-h-[40px]"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      const lineHeight = 24;
                      const maxHeight = lineHeight * 5;
                      target.style.height =
                        Math.min(target.scrollHeight, maxHeight) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        onSendReply();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="text-gray-500 hover:text-yellow-500 text-lg"
                    title="Biểu cảm"
                  >
                    <FontAwesomeIcon icon={["far", "face-smile"]} />
                  </button>

                  <label
                    htmlFor={`reply-file-input-${comment.id}`}
                    className="cursor-pointer text-gray-500 hover:text-blue-600"
                  >
                    <FontAwesomeIcon icon={["fas", "image"]} />
                  </label>
                  <input
                    type="file"
                    id={`reply-file-input-${comment.id}`}
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (replyPreviewUrl) {
                          try {
                            URL.revokeObjectURL(replyPreviewUrl);
                          } catch (err) {}
                        }
                        onReplyFileChange?.(file);
                        onReplyPreviewUrlChange?.(URL.createObjectURL(file));
                      }
                    }}
                  />

                  {(replyDraft.trim() || replyFile) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSendReply();
                      }}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={["fas", "paper-plane"]} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {comment.replies?.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => {
              const replyData = replyReactionData[reply.id] ?? {
                counts: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
                myReaction: null,
              };
              const totalReplyReactions = Object.values(
                replyData.counts || {}
              ).reduce((a, b) => a + b, 0);
              const isMyReply = currentUserId === reply.authorId;
              const isCurrentlyEditing = editingReplyId === reply.id;
              const canDeleteReply = isMyReply || isAdmin || (postOwnerId && currentUserId === postOwnerId);

              return (
                <div key={reply.id} className="flex gap-3 ml-10 mt-3">
                  <img
                    src={reply.authorAvatar}
                    alt={reply.authorName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 relative min-w-0">
                    <div className="bg-gray-50 rounded-xl p-3 shadow-sm max-w-xl">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-gray-900 text-sm">
                          {reply.authorName}
                        </p>
                        {canDeleteReply ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(reply.createdAt)}
                            </span>
                            <div className="relative">
                              <button
                                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenReplyMenuId((prev) =>
                                    prev === reply.id ? null : reply.id
                                  );
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={["fas", "ellipsis-vertical"]}
                                />
                              </button>
                              {openReplyMenuId === reply.id && (
                                <div className="absolute right-0 mt-2 w-36 bg-white border rounded shadow-lg z-50">
                                  {isMyReply && (
                                    <button
                                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                      onClick={() =>
                                        handleReplyEdit(reply.id, reply.content)
                                      }
                                    >
                                      Chỉnh sửa
                                    </button>
                                  )}
                                  <button
                                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-50"
                                    onClick={() => handleReplyDelete(reply.id)}
                                  >
                                    {isAdmin && !isMyReply ? "Xoá (Admin)" : (postOwnerId && currentUserId === postOwnerId && !isMyReply ? "Xoá (Chủ bài viết)" : "Xoá")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(reply.createdAt)}
                          </span>
                        )}
                      </div>

                      {isCurrentlyEditing ? (
                        <div className="mt-1 flex items-center gap-2">
                          <textarea
                            value={editingReplyContent}
                            onChange={(e) =>
                              onEditingReplyContentChange(e.target.value)
                            }
                            onKeyDown={(e) =>
                              handleReplyEditKeyDown(e, reply.id)
                            }
                            placeholder="Chỉnh sửa phản hồi..."
                            className="flex-1 outline-none text-sm border rounded-xl px-3 py-2 resize-none"
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = "auto";
                              target.style.height =
                                Math.min(target.scrollHeight, 120) + "px";
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => onSaveEditReply(reply.id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Lưu"
                          >
                            <FontAwesomeIcon icon={["fas", "check"]} />
                          </button>
                          <button
                            onClick={onCancelEditReply}
                            className="text-red-600 hover:text-red-700"
                            title="Huỷ"
                          >
                            <FontAwesomeIcon icon={["fas", "xmark"]} />
                          </button>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const firstUrl = getFirstUrl(reply.content);
                            const hasMediaFiles = reply.mediaFiles && reply.mediaFiles.length > 0;
                            const hasLink = !!firstUrl && !hasMediaFiles;
                            
                            return (
                              <>
                                <p className="text-gray-800 text-sm mt-0.5 whitespace-pre-wrap break-words">
                                  {hasLink && firstUrl ? reply.content.replace(firstUrl, '').trim() : reply.content}
                                </p>
                                {hasLink && firstUrl && (
                                  <div className="mt-2">
                                    <LinkPreview url={firstUrl} size="compact" lazy={false} />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {reply.mediaFiles && reply.mediaFiles.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {reply.mediaFiles.map((file, index) => (
                                <div key={index} className="relative">
                                  {file.fileType === "IMAGE" && (
                                    <img
                                      src={file.fileUrl}
                                      alt="Reply attachment"
                                      className="max-w-[160px] h-[160px] rounded-lg object-cover"
                                      onError={(e) => {
                                        console.error(
                                          "Failed to load reply image:",
                                          file.fileUrl
                                        );
                                        e.currentTarget.src =
                                          "/placeholder-image.png";
                                      }}
                                    />
                                  )}
                                  {file.fileType === "VIDEO" && (
                                    <video
                                      src={file.fileUrl}
                                      controls
                                      className="max-w-[160px] max-h-[160px] rounded-lg"
                                      onError={() => {
                                        console.error(
                                          "Failed to load reply video:",
                                          file.fileUrl
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <div
                        onMouseEnter={(e) => {
                          const btnEl = e.currentTarget.querySelector("button");
                          showReactionBar("reply", reply.id, btnEl);
                        }}
                        onMouseLeave={() => hideReactionBar()}
                        className="relative"
                      >
                        <button
                          className={`flex items-center gap-1 ${
                            replyData.myReaction
                              ? "font-semibold text-blue-600"
                              : "hover:text-blue-600"
                          }`}
                          onClick={async () => {
                            const targetEmotion: EmotionType =
                              replyData.myReaction || "like";
                            await onSelectReplyReaction(
                              reply.id,
                              targetEmotion
                            );
                          }}
                        >
                          {replyData.myReaction ? (
                            <img
                              src={getReactionIcon(replyData.myReaction)}
                              alt=""
                              className="w-4 h-4"
                            />
                          ) : (
                            <FontAwesomeIcon icon={["far", "thumbs-up"]} />
                          )}
                          <span>
                            {replyData.myReaction
                              ? capitalize(replyData.myReaction)
                              : "Like"}
                          </span>
                          {totalReplyReactions > 0 && (
                            <span className="text-xs text-gray-400 ml-1">
                              · {totalReplyReactions}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getReactionIcon(key: EmotionType | null): string {
  switch (key) {
    case "like":
      return likeIcon;
    case "love":
      return loveIcon;
    case "haha":
      return hahaIcon;
    case "wow":
      return wowIcon;
    case "sad":
      return sadIcon;
    case "angry":
      return angryIcon;
    default:
      return "";
  }
}

function capitalize(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}