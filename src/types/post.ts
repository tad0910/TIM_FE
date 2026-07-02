import type { EmotionType } from "../services/reactionsApi";

export interface Post {
  id: string;
  userId: string;
  content: string;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  totalReactions?: number;
  totalComments?: number;
  comments: Comment[];
  reactions: Reaction[];
  userAvatar?: string;
  username?: string;
  fullName?: string;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
  
  image?: string;
  images?: string[];
  video?: string;
  videos?: string[]; 
  files?: Array<string | FileInfo>;
  documents?: DocumentFile[]; 
  linkPreview?: {  
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    domain: string;
  };
}

export interface MediaFile {
  fileUrl: string;
  fileType: string;
}

export interface Comment {
  replyComments: never[];
  id: string;
  userId: string;
  username: string;
  fullName?: string;
  content: string;
  emotion?: string | null;
  createdAt: string;
  userAvatar?: string;
  mediaFiles?: MediaFile[];
  files?: MediaFile[];
  replies?: ReplyComment[];
}


export interface ReplyComment extends Comment {
  parentId: string;
}

export interface Reaction {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  emotionType: EmotionType;
  createdAt: string;
}

export interface FileInfo {
  id: number;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other';

export type PrivacyType = 'open' | 'friends' | 'only_me';

export interface AuthorInfo {
  id: string;
  name: string;
  avatar: string;
  username?: string;
}

export interface UserPublicInfo {
  id: string;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  profileImage?: string;
}


export interface CreatePostRequest {
  userId: string;
  content: string;
  privacy?: PrivacyType | string;
  files?: File[];
}

export interface UpdatePostRequest {
  content: string;
  privacy?: PrivacyType | string;
}

export interface CreateCommentRequest {
  userId: string;
  content: string;
  emotion?: string;
  fileId?: string;
}

export interface UpdateCommentRequest {
  content: string;
  emotion?: string;
}

export interface CreateReplyRequest {
  userId: string;
  content: string;
  emotion?: string;
  fileId?: string;
}



export interface PostResponse {
  id: string;
  userId: string;
  content: string;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  totalReactions: number;
  totalComments: number;
  comments?: CommentResponse[];
  reactions?: ReactionResponse[];
  files?: FileInfoResponse[];
  userAvatar?: string;
  username?: string;
  fullName?: string;
}

export interface CommentResponse {
  id: string;
  userId: string;
  username: string;
  fullName?: string;
  userAvatar?: string;
  content: string;
  emotion?: string | null;
  fileId?: string | null;
  createdAt: string;
  replyComments?: ReplyCommentResponse[];
}

export interface ReplyCommentResponse {
  id: string;
  userId: string;
  username: string;
  fullName?: string;
  userAvatar?: string;
  content: string;
  emotion?: string | null;
  fileId?: string | null;
  createdAt: string;
}

export interface ReactionResponse {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  emotionType: string;
  createdAt: string;
}

export interface FileInfoResponse {
  id: number;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export interface PostsPageResponse {
  content: PostResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}



export type PostActionType = 'like' | 'comment' | 'share';

export interface PostInteractionState {
  isLiked: boolean;
  likeEmotion?: EmotionType;
  isCommented: boolean;
  isShared: boolean;
}


export type {
  EmotionType
} from "../services/reactionsApi";
