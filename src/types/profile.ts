import type { Post } from './post';

export interface UserImage {
  id: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  coverImage?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string | null;
  createdAt: string;
  posts: Post[];
  images: UserImage[];
  name?: string;
  bio?: string;
  occupation?: string;
  status?: string;
  avatar?: string;
  joinDate?: string;
}


export interface Progress {
  courseName: string;
  percentage: number;
  totalLessons: number;
  completedLessons: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  color: string;
}

export interface CreatePostRequest {
  content: string;
  image?: File;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}
