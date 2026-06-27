import { api } from "./api";
import type { Comment, ReplyComment, MediaFile } from "../types/post";

const BASE_URL = (import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081") as string;

function mapFilesToMediaFiles(files: any[]): MediaFile[] {
  if (!files || !Array.isArray(files)) return [];
  
  const makeImageUrl = (url?: string) => {
    if (!url || typeof url !== 'string') return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/uploads")) return `${BASE_URL.replace(/\/$/, "")}${url}`;
    return url;
  };

  return files.map((file: any) => ({
    fileUrl: makeImageUrl(file.fileUrl || file.url),
    fileType: file.fileType || file.type || "IMAGE",
  }));
}

export async function getCommentsByPost(postId: string): Promise<Comment[]> {
  const data = await api.get<any>(`/comments/posts/${postId}`);
  
  let comments: any[] = [];
  if (Array.isArray(data)) {
    comments = data;
  } else if (data && typeof data === 'object' && 'content' in data && Array.isArray(data.content)) {
    comments = data.content;
  } else {
    console.warn("getCommentsByPost: API returned unexpected format", data);
    return [];
  }
  
  return comments.map((comment: any) => ({
    ...comment,
    id: String(comment.id),
    userId: String(comment.userId),
    mediaFiles: mapFilesToMediaFiles(comment.files || []),
    files: mapFilesToMediaFiles(comment.files || []),
  } as Comment));
}

export async function createComment(
  postId: string,
  params: {
    userId?: string;
    content: string;
    emotion?: string;
    files?: File[];
    file?: File | null;
  }
): Promise<Comment> {
  const form = new FormData();

  if (!params.userId) {
    try {
      const { useAuthStore } = await import("../store/useAuthStore");
      const { user } = useAuthStore.getState();
      params.userId = user?.id || localStorage.getItem("userId") || undefined;
    } catch {}
  }
  if (!params.userId) throw new Error("Missing userId for creating comment");

  form.append("userId", params.userId);
  form.append("content", params.content);
  if (params.emotion) form.append("emotion", params.emotion);
  if (params.files && params.files.length > 0) {
    params.files.forEach((f) => form.append("files", f));
  }
  if (params.file) {
    form.append("files", params.file);
  }

  const response = await api.post<any>(`/comments/posts/${postId}`, form, undefined, true);
  
  return {
    ...response,
    id: String(response.id),
    userId: String(response.userId),
    mediaFiles: mapFilesToMediaFiles(response.files || []),
    files: mapFilesToMediaFiles(response.files || []),
  } as Comment;
}

export async function updateComment(
  commentId: string,
  params: { userId: string; content: string; emotion?: string }
): Promise<Comment> {
  const form = new FormData();
  form.append("userId", params.userId);
  form.append("content", params.content);
  if (params.emotion) form.append("emotion", params.emotion);

  return api.put<Comment>(`/comments/${commentId}`, form, undefined, true);
}

export async function deleteComment(
  commentId: string,
  userId: string
): Promise<string> {
  return api.delete<string>(`/comments/${commentId}?userId=${userId}`);
}

export async function getReplies(commentId: string): Promise<ReplyComment[]> {
  const data = await api.get<ReplyComment[]>(`/comments/${commentId}/replies`);
  return Array.isArray(data) ? data : [];
}

export async function createReply(
  commentId: string,
  params: {
    userId?: string;
    content: string;
    emotion?: string;
    files?: File[];
    file?: File | null;
  }
): Promise<ReplyComment> {
  const form = new FormData();

  if (!params.userId) {
    try {
      const { useAuthStore } = await import("../store/useAuthStore");
      const { user } = useAuthStore.getState();
      params.userId = user?.id || localStorage.getItem("userId") || undefined;
    } catch {}
  }
  if (!params.userId) throw new Error("Missing userId for creating reply");

  form.append("userId", params.userId);
  form.append("content", params.content);
  if (params.emotion) form.append("emotion", params.emotion);
  if (params.files && params.files.length > 0) {
    params.files.forEach((f) => form.append("files", f));
  }
  if (params.file) {
    form.append("files", params.file);
  }

  return api.post<ReplyComment>(
    `/comments/${commentId}/replies`,
    form,
    undefined,
    true
  );
}

export async function updateReply(
  replyCommentId: string,
  params: { content: string; emotion?: string }
): Promise<ReplyComment> {
  const form = new FormData();
  form.append("content", params.content);
  if (params.emotion) form.append("emotion", params.emotion);

  return api.put<ReplyComment>(
    `/comments/replies/${replyCommentId}`,
    form,
    undefined,
    true
  );
}

export async function deleteReply(replyCommentId: string): Promise<string> {
  return api.delete<string>(`/comments/replies/${replyCommentId}`);
}

export async function getCommentCount(postId: string): Promise<number> {
  try {
    const comments = await getCommentsByPost(postId);
    return comments.length;
  } catch (error) {
    console.warn("Failed to get comment count:", error);
    return 0;
  }
}

export default {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  createReply,
  getReplies,
  updateReply,
  deleteReply,
  getCommentCount,
};
