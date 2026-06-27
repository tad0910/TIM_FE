import { api } from "./api";
import type {
  Post,
  Comment,
  Reaction,
  CreatePostRequest
} from "../types/post";
import reactionsApi from "./reactionsApi";

interface PostResponse {
  id: string;
  userId?: string;
  content: string;
  privacy: string | { name: string };
  createdAt: string;
  updatedAt: string;
  totalReactions?: number;
  totalComments?: number;
  comments?: unknown[];
  reactions?: unknown[];
  files?: Array<{
    id: number;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number;
  }>;
  user?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    avatar?: string;
  };
  userAvatar?: string;
  username?: string;
  fullName?: string;
  image?: string;
  images?: string[];
  originalNames?: string[];
  linkPreview?: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    domain: string;
  };
}

interface PostsPageResponse {
  content: PostResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type { 
  Post, 
  CreatePostRequest, 
  UpdatePostRequest 
} from "../types/post";

export const getAllPosts = async (page = 0, size = 10): Promise<Post[]> => {
  try {
    const res = await api.get<PostsPageResponse>("/posts", { page, size });
  const content = Array.isArray(res?.content) ? res.content : [];
    const posts = await Promise.all(content.map(mapPostDtoToPost));
    
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    
    if (error instanceof Error && error.message.includes('500')) {
      console.warn('Posts API returned 500 - likely due to database enum mismatch');
      return []; 
    }
    
    throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getPostsByUser = async (userId: string, page: number = 0, size: number = 20): Promise<Post[]> => {
  try {
    const raw = await api.get<unknown>(`/posts/user/${userId}`, { page, size });

    let items: unknown[] = [];
    if (Array.isArray(raw)) {
      items = raw as unknown[];
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.content)) {
        items = obj.content as unknown[];
      } else if (Array.isArray((obj as any).data)) {
        items = (obj as any).data as unknown[];
      } else if (Array.isArray((obj as any).items)) {
        items = (obj as any).items as unknown[];
      } else {
        items = [];
      }
    }

    const posts = await Promise.all((items as PostResponse[]).map(mapPostDtoToPost));
    return posts;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    if (error instanceof Error && error.message.includes('500')) {
      console.warn('User posts API returned 500 - likely due to database enum mismatch');
      return []; 
    }
    throw new Error(`Failed to fetch user posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


export const getPostById = async (postId: string): Promise<Post> => {
  try {
    const { useAuthStore } = await import("../store/useAuthStore");
    const { user } = useAuthStore.getState();
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    const dto = await api.get<PostResponse>(`/posts/${postId}/user/${user.id}`);
    return mapPostDtoToPost(dto);
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw new Error(`Failed to fetch post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createPost = async (data: CreatePostRequest & { userId: string; files?: File[]; privacy?: "open" | "friends" | "only_me" }): Promise<Post> => {
  try {
  const form = new FormData();
    const userIdStr = String(data.userId);
    if (!userIdStr || userIdStr.trim() === '') {
    throw new Error("Invalid userId for createPost");
  }
  const contentStr = String(data.content ?? "").trim();
  if (!contentStr && !(data.files && data.files.length)) {
    throw new Error("Content or files is required");
  }
    form.append("userId", userIdStr);
  form.append("content", contentStr);
  const privacy = normalizePrivacy(data.privacy);
  form.append("privacy", privacy);
  
  const originalFilenames: string[] = [];
  if (data.files && data.files.length) {
    for (const f of data.files) {
      form.append("files", f);
      originalFilenames.push(f.name);
    }
  }
    const dto = await api.post<PostResponse>("/posts/create", form, undefined, true);
  
  console.log('[postApi] createPost response:', dto);
  console.log('[postApi] createPost response files:', dto?.files);
  
  if (originalFilenames.length > 0) {
    const postId = (dto as PostResponse).id || String(Date.now());
    localStorage.setItem(`post_${postId}_filenames`, JSON.stringify(originalFilenames));
  }
  
  const mappedPost = await mapPostDtoToPost(dto);
  console.log('[postApi] mappedPost documents:', mappedPost.documents);
  console.log('[postApi] mappedPost images:', mappedPost.images);
  console.log('[postApi] mappedPost videos:', mappedPost.videos);
  
  return mappedPost;
  } catch (error) {
    console.error('Error creating post:', error);
    throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createPlainTextPost = async (
  userId: string,
  content: string,
  privacy: "open" | "friends" | "only_me" = "open"
): Promise<Post> => {
  return createPost({ userId, content, privacy, files: undefined });
};

export const createPostWithImages = async (
  userId: string,
  content: string,
  files: File[],
  privacy: "open" | "friends" | "only_me" = "open"
): Promise<Post> => {
  return createPost({ userId, content, files, privacy });
};


export const sharePost = async (postId: string): Promise<void> => {
  const postUrl = `${window.location.origin}/post/${postId}`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(postUrl);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = postUrl;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

export const getPostStats = async (postId: string) => {
  const post = await getPostById(postId);
  return {
    totalReactions: post.totalReactions,
    totalComments: post.totalComments,
  };
};

export default {
  getAllPosts,
  getPostsByUser,
  getPostById,
  createPost,
  createPlainTextPost,
  createPostWithImages,
  updatePost,
  updatePostWithFiles,
  deletePost,
  updatePostPrivacy,
  sharePost,
  getPostStats,
};

async function mapPostDtoToPost(dto: PostResponse): Promise<Post> {
  const base = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
  const makeImageUrl = (u?: string | unknown) => {
    if (!u || typeof u !== 'string') return "";
    if (u.startsWith("http")) return u;
    if (u.startsWith("/uploads")) return `${base.replace(/\/$/, "")}${u}`;
    return u;
  };

  const author = {
    id: String(dto.userId ?? dto.user?.id ?? "unknown"),
    name: dto.fullName || dto.username || "Người dùng",
    avatar: makeImageUrl(dto.userAvatar || dto.user?.profileImage || dto.user?.avatar || ""),
  };

  console.log('PostResponse from backend:', dto);
  console.log('Author mapping debug:', {
    dtoUserId: dto.userId,
    userObject: dto.user,
    userObjectId: dto.user?.id,
    finalAuthorId: String(dto.userId ?? dto.user?.id ?? "unknown")
  });
  console.log('Image fields:', { 
    image: dto.image, 
    images: dto.images, 
    files: dto.files 
  });
  
  let imageUrl = "";
  let imageUrls: string[] = [];
  let videoUrl = "";
  let videoUrls: string[] = [];
  let documents: Array<{ id: string; name: string; url: string; size: number; type: string }> = [];
  
  if (dto.image && typeof dto.image === 'string') {
    imageUrl = makeImageUrl(dto.image);
    imageUrls = [imageUrl];
    console.log('Using dto.image:', imageUrl);
  } else if (dto.images && Array.isArray(dto.images) && dto.images.length > 0) {
    imageUrls = dto.images
      .filter(img => typeof img === 'string')
      .map(img => makeImageUrl(img));
    imageUrl = imageUrls[0] || "";
    console.log('Using dto.images:', imageUrls);
  } else if (dto.files && Array.isArray(dto.files) && dto.files.length > 0) {
    console.log('Files array:', dto.files);
    console.log('Files[0] type:', typeof dto.files[0]);
    console.log('Files[0] value:', dto.files[0]);
    
    const fileInfos: Array<{ id: number; url: string; type: string }> = [];
    const imageFileObjs: Array<{ url: string; fileName?: string; fileSize?: number }> = [];
    const videoFileObjs: Array<{ url: string; fileName?: string; fileSize?: number }> = [];
    const documentFileObjs: Array<{ url: string; fileName?: string; fileSize?: number }> = [];
    
    // Process files and categorize by fileType from backend
    dto.files.forEach((file) => {
      if (typeof file === 'string') {
        // Legacy string format - try to determine type by extension
        const url = makeImageUrl(file);
        const ext = url.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          imageFileObjs.push({ url });
        } else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext || '')) {
          videoFileObjs.push({ url });
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'].includes(ext || '')) {
          documentFileObjs.push({ url });
        }
      } else if (typeof file === 'object' && file !== null) {
        const fileObj = file as { 
          id?: number; 
          fileUrl?: string; 
          fileType?: string; 
          fileName?: string;
          fileSize?: number;
          url?: string; 
          path?: string; 
          filename?: string; 
          name?: string 
        };
        const filePath = fileObj.fileUrl || fileObj.url || fileObj.path || fileObj.filename || fileObj.name;
        if (filePath && typeof filePath === 'string') {
          const fullUrl = makeImageUrl(filePath);
          const fileType = (fileObj.fileType || '').toUpperCase();
          // Priority: fileName > filename > name (from backend)
          const fileName = fileObj.fileName || fileObj.filename || fileObj.name || '';
          const fileSize = fileObj.fileSize || 0;
          
          console.log('[postApi] Processing file object:', {
            id: fileObj.id,
            fileType,
            fileName,
            fileSize,
            fileUrl: filePath
          });
          
          if (fileObj.id && fileObj.fileType) {
            fileInfos.push({ id: fileObj.id, url: fullUrl, type: fileObj.fileType });
          }
          
          // Categorize by fileType from backend (more reliable than URL extension)
          if (fileType === 'IMAGE' || fileType === 'PHOTO') {
            imageFileObjs.push({ url: fullUrl, fileName, fileSize });
          } else if (fileType === 'VIDEO') {
            videoFileObjs.push({ url: fullUrl, fileName, fileSize });
          } else if (fileType === 'DOCUMENT' || fileType === 'FILE') {
            documentFileObjs.push({ url: fullUrl, fileName, fileSize });
          } else {
            // Fallback: try to determine by extension if fileType is not set
            const ext = (fileName || fullUrl).toLowerCase().split('.').pop();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
              imageFileObjs.push({ url: fullUrl, fileName, fileSize });
            } else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext || '')) {
              videoFileObjs.push({ url: fullUrl, fileName, fileSize });
            } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'].includes(ext || '')) {
              documentFileObjs.push({ url: fullUrl, fileName, fileSize });
            }
          }
        }
      }
    });
    
    (window as { __postFileInfos?: Record<string, Array<{ id: number; url: string; type: string }>> }).__postFileInfos = (window as { __postFileInfos?: Record<string, Array<{ id: number; url: string; type: string }>> }).__postFileInfos || {};
    (window as { __postFileInfos?: Record<string, Array<{ id: number; url: string; type: string }>> }).__postFileInfos![dto.id] = fileInfos;
    
    // Extract URLs
    imageUrls = imageFileObjs.map(f => f.url);
    videoUrls = videoFileObjs.map(f => f.url);
    
    // Map documents with proper names
    documents = documentFileObjs.map((fileObj, index) => {
      // Priority: fileName from backend > localStorage > fallback
      let originalName = fileObj.fileName || `document_${index}`;
      
      // Try to get original filename from localStorage if fileName from backend is not available or doesn't have extension
      if (!fileObj.fileName || !fileObj.fileName.includes('.')) {
        try {
          const storedFilenames = localStorage.getItem(`post_${dto.id}_filenames`);
          if (storedFilenames) {
            const filenames = JSON.parse(storedFilenames);
            // If we have fileName from backend, try to match by extension
            if (fileObj.fileName) {
              const fileExt = fileObj.fileName.toLowerCase().split('.').pop();
              const matchingIndex = filenames.findIndex((name: string) => {
                const nameExt = name.toLowerCase().split('.').pop();
                return nameExt === fileExt;
              });
              if (matchingIndex >= 0 && filenames[matchingIndex]) {
                originalName = filenames[matchingIndex];
              } else if (filenames[index]) {
                originalName = filenames[index];
              } else {
                // Use fileName from backend if it exists, even without extension
                originalName = fileObj.fileName;
              }
            } else {
              // No fileName from backend, use localStorage
              if (filenames[index]) {
                originalName = filenames[index];
              }
            }
          } else if (fileObj.fileName) {
            // Use fileName from backend if localStorage is empty
            originalName = fileObj.fileName;
          }
        } catch (error) {
          console.log('Could not retrieve original filename from localStorage:', error);
          if (fileObj.fileName) {
            originalName = fileObj.fileName;
          }
        }
      }
      
      // Ensure filename has proper extension
      const ext = originalName.toLowerCase().split('.').pop();
      if (!ext || ext === originalName.toLowerCase()) {
        // No extension found, try to get from fileName or infer from fileType
        if (fileObj.fileName && fileObj.fileName.includes('.')) {
          originalName = fileObj.fileName;
        }
      }
      
      const finalExt = originalName.toLowerCase().split('.').pop() || '';
      const doc = {
        id: `doc_${index}`,
        name: originalName,
        url: fileObj.url,
        size: fileObj.fileSize || 0,
        type: getMimeTypeFromExtension(finalExt)
      };
      console.log('[postApi] Created document:', doc);
      return doc;
    });
    
    imageUrl = imageUrls[0] || "";
    videoUrl = videoUrls[0] || "";
    console.log('Using dto.files - Images:', imageUrls.length, 'Videos:', videoUrls.length, 'Documents:', documents.length);
    console.log('[postApi] Documents details:', documents);
  }

  const linkPreview = dto.linkPreview ? {
    url: dto.linkPreview.url || "",
    title: dto.linkPreview.title || "",
    description: dto.linkPreview.description || "",
    imageUrl: dto.linkPreview.imageUrl ? makeImageUrl(dto.linkPreview.imageUrl) : "",
    domain: dto.linkPreview.domain || "",
  } : undefined;


  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "";

    if (Array.isArray(dateValue)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateValue;
      // Comment UTC conversion - use local time instead
      // const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      const date = new Date(year, month - 1, day, hour, minute, second);
      const iso = date.toISOString();
      console.log("[postApi] formatDate from array:", {
        raw: dateValue,
        parsedLocalIso: iso,
        parsedLocal: date.toString(),
      });
      return iso;
    }

    if (typeof dateValue === "string") {
      const str = dateValue;

      if (str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString();
      }

      const m = str.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
      );
      if (m) {
        const [, y, mo, d, hh, mm, ss] = m;
        // Comment UTC conversion - use local time instead
        // const date = new Date(
        //   Date.UTC(
        //     Number(y),
        //     Number(mo) - 1,
        //     Number(d),
        //     Number(hh),
        //     Number(mm),
        //     Number(ss)
        //   )
        // );
        const date = new Date(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          Number(ss)
        );
        const iso = date.toISOString();
        console.log("[postApi] formatDate from string (local time):", {
          raw: str,
          parsedLocalIso: iso,
          parsedLocal: date.toString(),
        });
        return iso;
      }
    }

    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }

    return String(dateValue);
  };

  let reactions: Reaction[] = Array.isArray(dto.reactions)
    ? (dto.reactions as Reaction[])
    : [];

  if (!reactions.length) {
    try {
      reactions = await reactionsApi.getReactionsByPostId(String(dto.id));
    } catch (error) {
      console.warn(
        "[postApi] Failed to load reactions for post, continuing without them",
        { postId: dto.id, error }
      );
    }
  }

  return {
    id: String(dto.id),
    userId: String(dto.userId ?? ""),
    content: String(dto.content ?? ""),
    privacy: String((dto.privacy && typeof dto.privacy === "string" ? dto.privacy : (dto.privacy as { name: string })?.name) ?? "open"),
    createdAt: formatDate(dto.createdAt),
    updatedAt: formatDate(dto.updatedAt ?? dto.createdAt),
    totalReactions: dto.totalReactions || 0,
    totalComments: dto.totalComments || 0,
    comments: Array.isArray(dto.comments) ? (dto.comments as Comment[]) : [],
    reactions,
    files: dto.files || [],
    userAvatar: dto.userAvatar,
    username: dto.username,
    fullName: dto.fullName,
    author,
    image: imageUrl || undefined,
    images: imageUrls.length > 0 ? imageUrls : undefined,
    video: videoUrl || undefined,
    videos: videoUrls.length > 0 ? videoUrls : undefined,
    documents: documents.length > 0 ? documents : undefined,
    linkPreview,
  };
}

function getMimeTypeFromExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

function normalizePrivacy(p?: string): "open" | "friends" | "only_me" {
  if (!p) return "open";
  const v = p.toLowerCase();
  if (v === "public" || v === "open") return "open";
  if (v === "friends") return "friends";
  if (v === "only_me" || v === "onlyme" || v === "only-me") return "only_me";
  return "open";
}

export async function updatePost(
  postId: string, 
  content: string, 
  privacy: "open" | "friends" | "only_me" = "open"
): Promise<Post> {
  try {
    console.log("[postApi] Attempting to update post:", { postId, content, privacy });
    
    const { useAuthStore } = await import("../store/useAuthStore");
    const { user } = useAuthStore.getState();
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("content", content);
    formData.append("privacy", privacy === "open" ? "public" : privacy);
    
    const data = await api.put<PostResponse>(`/posts/${postId}`, formData, undefined, true);
    console.log("[postApi] Update successful:", data);
    
    const mappedPost = await mapPostDtoToPost(data);
    
    return mappedPost;
  } catch (error) {
    console.error("Error updating post:", error);
    const errorMessage = (error as Error)?.message || "Unknown error";
    if (errorMessage.includes("Session expired")) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
    }
    throw new Error(`Failed to update post: ${errorMessage}`);
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    const { useAuthStore } = await import("../store/useAuthStore");
    const { user } = useAuthStore.getState();
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    await api.delete<void>(`/posts/${postId}?userId=${user.id}`);
  } catch (error) {
    console.error("Error deleting post:", error);
    throw new Error(`Failed to delete post: ${(error as Error)?.message || "Unknown error"}`);
  }
}

export async function updatePostPrivacy(
  postId: string, 
  privacy: "open" | "friends" | "only_me"
): Promise<Post> {
  try {
    const { useAuthStore } = await import("../store/useAuthStore");
    const { user } = useAuthStore.getState();
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("privacy", privacy === "open" ? "OPEN" : privacy.toUpperCase());
    
    const data = await api.patch<PostResponse>(`/posts/${postId}/privacy`, formData, undefined, true);
    const mappedPost = await mapPostDtoToPost(data);
    
    return mappedPost;
  } catch (error) {
    console.error("Error updating post privacy:", error);
    throw new Error(`Failed to update post privacy: ${(error as Error)?.message || "Unknown error"}`);
  }
}

export async function updatePostWithFiles(
  postId: string,
  content: string,
  privacy: "open" | "friends" | "only_me" = "open",
  files: File[] = [],
  removedFileIds: number[] = []
): Promise<Post> {
  try {
    console.log("[postApi] Attempting to update post with files:", { postId, content, privacy, filesCount: files.length, removedFileIdsCount: removedFileIds.length });
    
    const { useAuthStore } = await import("../store/useAuthStore");
    const { user, accessToken } = useAuthStore.getState();
    
    if (!user?.id || !accessToken) {
      throw new Error("User not authenticated");
    }

    const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081";
    const url = `${baseUrl}/posts/${postId}`;

    const formData = new FormData();
    formData.append('content', content);
    formData.append('privacy', privacy);
    formData.append('userId', user.id);
    
    files.forEach((file) => {
      formData.append(`files`, file);
    });
    
    console.log('Sending file IDs to delete:', removedFileIds);
    removedFileIds.forEach((fileId) => {
      formData.append(`fileIdsToDelete`, fileId.toString());
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const updatedPost = await response.json();
    console.log("[postApi] Post updated successfully:", updatedPost);
    
    return mapPostDtoToPost(updatedPost);
  } catch (error) {
    console.error("Error updating post with files:", error);
    throw new Error(`Failed to update post: ${(error as Error)?.message || "Unknown error"}`);
  }
}
