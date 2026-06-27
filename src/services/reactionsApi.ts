import { api } from "./api";
import type { Reaction } from "../types/post";

export type EmotionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export const reactionsApi = {
  async createOrUpdatePostReaction(
    postId: string,
    params: { userId: string; emotionType: EmotionType }
  ): Promise<Reaction> {
    const formData = new FormData();
    formData.set("userId", params.userId);
    formData.set("emotionType", params.emotionType);
    return api.post<Reaction>(`/reactions/posts/${postId}`, formData);
  },

  async getReactionsByPostId(postId: string): Promise<Reaction[]> {
    const result = await api.get<any>(`/reactions/posts/${postId}`);
    if (Array.isArray(result)) {
      return result;
    }
    if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
      return result.content;
    }
    console.warn("getReactionsByPostId: API returned unexpected format, returning empty array", result);
    return [];
  },

  async deletePostReaction(
    postId: string,
    params: { userId: string }
  ): Promise<string> {
    return api.delete<string>(
      `/reactions/posts/${postId}?userId=${encodeURIComponent(params.userId)}`
    );
  },

  async countPostReactions(
    postId: string,
    emotionType: EmotionType
  ): Promise<number> {
    return api.get<number>(`/reactions/posts/${postId}/count/${emotionType}`);
  },

  async getReactionCounts(postId: string): Promise<Record<EmotionType, number>> {
    console.log("Getting reaction counts by counting from reactions list for post:", postId);
    
    try {
      const reactions = await this.getReactionsByPostId(postId);
      const counts: Record<EmotionType, number> = {
        like: 0,
        love: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      };
      
      if (Array.isArray(reactions)) {
        reactions.forEach(reaction => {
          if (reaction.emotionType && reaction.emotionType in counts) {
            counts[reaction.emotionType as EmotionType]++;
          }
        });
      } else {
        console.warn("getReactionCounts: reactions is not an array", reactions);
      }
      
      console.log("Counted reactions:", counts);
      return counts;
    } catch (error) {
      console.error("Failed to get reactions for counting:", error);
      return {
        like: 0,
        love: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      };
    }
  },

  async getAllPostReactionCounts(
    postId: string
  ): Promise<Record<EmotionType, number>> {
    return this.getReactionCounts(postId);
  },

  async createOrUpdateCommentReaction(commentId: string, params: { userId: string; emotionType: EmotionType }): Promise<Reaction> {
    const formData = new FormData();
    formData.set("userId", params.userId);
    formData.set("emotionType", params.emotionType);
    formData.set("commentId", commentId);
    formData.set("comment_id", commentId);
    console.log("[reactionsApi] createOrUpdateCommentReaction", {
      commentId,
      userId: params.userId,
      emotionType: params.emotionType,
    });
    return api.post<Reaction>(`/reactions/comments/${commentId}`, formData);
  },

  async getReactionsByCommentId(commentId: string): Promise<Reaction[]> {
    const result = await api.get<any>(`/reactions/comments/${commentId}`);
    if (Array.isArray(result)) {
      return result;
    }
    if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
      return result.content;
    }
    console.warn("getReactionsByCommentId: API returned unexpected format, returning empty array", result);
    return [];
  },

  async deleteCommentReaction(
    commentId: string,
    params: { userId: string }
  ): Promise<string> {
    return api.delete<string>(
      `/reactions/comments/${commentId}?userId=${encodeURIComponent(
        params.userId
      )}`
    );
  },

  async countCommentReactions(
    commentId: string,
    emotionType: EmotionType
  ): Promise<number> {
    return api.get<number>(
      `/reactions/comments/${commentId}/count/${emotionType}`
    );
  },

  async createOrUpdateReplyReaction(replyCommentId: string, params: { userId: string; emotionType: EmotionType }): Promise<Reaction> {
    const formData = new FormData();
    formData.set("userId", params.userId);
    formData.set("emotionType", params.emotionType);
    formData.set("replyCommentId", replyCommentId);
    formData.set("reply_comment_id", replyCommentId);
    formData.set("replyId", replyCommentId);
    console.log("[reactionsApi] createOrUpdateReplyReaction", {
      replyCommentId,
      userId: params.userId,
      emotionType: params.emotionType,
    });
    return api.post<Reaction>(`/reactions/replies/${replyCommentId}`, formData);
  },

  async getReactionsByReplyId(replyCommentId: string): Promise<Reaction[]> {
    const result = await api.get<any>(`/reactions/replies/${replyCommentId}`);
    if (Array.isArray(result)) {
      return result;
    }
    if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
      return result.content;
    }
    console.warn("getReactionsByReplyId: API returned unexpected format, returning empty array", result);
    return [];
  },

  async deleteReplyReaction(
    replyCommentId: string,
    params: { userId: string }
  ): Promise<string> {
    return api.delete<string>(
      `/reactions/replies/${replyCommentId}?userId=${encodeURIComponent(
        params.userId
      )}`
    );
  },

  async countReplyReactions(
    replyCommentId: string,
    emotionType: EmotionType
  ): Promise<number> {
    return api.get<number>(
      `/reactions/replies/${replyCommentId}/count/${emotionType}`
    );
  },
};

export default reactionsApi;
