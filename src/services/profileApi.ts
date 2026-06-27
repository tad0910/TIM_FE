import { api } from "./api";
import type { 
  UserProfile, 
  UserImage,
  Progress, 
  Badge, 
  CreatePostRequest, 
  UpdateProfileRequest 
} from "../types/profile";
import type { Post } from "../types/post";
import { getAttendanceStats, type AttendanceStatsDto } from "./attendanceApi";

interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImage?: string;
  coverImage?: string;
  role?: string;
  createdAt: string;
  posts?: Post[];
  images?: UserImage[];
  bio?: string;
  occupation?: string;
  status?: string;
  avatar?: string;
  joinDate?: string;
}

interface AvatarUploadResponse {
  imageUrl: string;
  user: UserResponse;
}

interface ProfileResponse {
  userId: string;
  username: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  coverImage?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt: string;
  posts?: Post[];
  images?: UserImage[];
  bio?: string;
  occupation?: string;
  status?: string;
  avatar?: string;
  joinDate?: string;
}

export type { 
  UserProfile, 
  Progress, 
  Badge, 
  CreatePostRequest, 
  UpdateProfileRequest 
} from "../types/profile";
export type { Post } from "../types/post";

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get<ProfileResponse>(`/profile/${userId}`);
  
  return {
    userId: response.userId,
    username: response.username,
    email: response.email,
    phoneNumber: response.phoneNumber || null,
    profileImage: response.profileImage || null,
    coverImage: response.coverImage || null,
    firstName: response.firstName || null,
    lastName: response.lastName || null,
    role: response.role || null,
    createdAt: response.createdAt,
    posts: response.posts || [],
    images: response.images || [],
    name: undefined,
    bio: response.bio,
    occupation: response.occupation,
    status: response.status,
    avatar: response.avatar || response.profileImage,
    joinDate: response.joinDate || response.createdAt
  };
};

export const getCoverImage = async (
  userId: string
): Promise<{ userId: number; coverImage: string | null }> => {
  return api.get<{ userId: number; coverImage: string | null }>(`/users/${userId}/cover-image`);
};

export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileRequest
): Promise<UserProfile> => {
  const response = await api.put<UserResponse>(`/users/${userId}`, data);
  
  console.log('Backend response:', response);
  
  const mappedProfile = {
    userId: response.id,
    username: response.username,
    email: response.email,
    phoneNumber: response.phoneNumber || null,
    profileImage: response.profileImage || null,
    coverImage: response.coverImage || null,
    firstName: response.firstName || null,
    lastName: response.lastName || null,
    role: response.role || null,
    createdAt: response.createdAt,
    posts: response.posts || [],
    images: response.images || [],
    name: undefined,
    bio: response.bio,
    occupation: response.occupation,
    status: response.status,
    avatar: response.avatar || response.profileImage,
    joinDate: response.joinDate || response.createdAt
  };
  
  console.log('Mapped profile:', mappedProfile);
  return mappedProfile;
};

export const getUserById = async (userId: string): Promise<UserResponse> => {
  return api.get<UserResponse>(`/users/${userId}`);
};

export const getUserProfileById = async (userId: string): Promise<UserProfile> => {
  return getUserProfile(userId);
};

export interface UserImageItem {
  id: number;
  imageUrl: string;
  description?: string | null;
  createdAt: string;
}

export const getPersonalImages = async (userId: string): Promise<UserImageItem[]> => {
  return api.get<UserImageItem[]>(`/users/${userId}/image`);
};

export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<AvatarUploadResponse> => {
  console.log(file);
  
  const formData = new FormData();
  formData.append("file", file);
  return api.post<AvatarUploadResponse>(`/users/${userId}/profile-image`, formData);
};

export const uploadCover = async (
  userId: string,
  file: File
): Promise<{ imageUrl: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post<{ imageUrl: string }>(`/users/${userId}/cover-image`, formData);
};

export const getProfileImage = async (userId: string): Promise<{ userId: number; profileImage: string | null }> => {
  return api.get<{ userId: number; profileImage: string | null }>(`/users/${userId}/profile-image`);
};

export const updateProfileImage = async (userId: string, imageUrl: string): Promise<{ imageUrl: string }> => {
  return api.put<{ imageUrl: string }>(`/users/${userId}/profile-image`, { imageUrl });
};

export const deleteAvatar = async (userId: string): Promise<void> => {
  await updateProfileImage(userId, "");
};

export const getUserPosts = async (
  userId: string,
  _page = 1,
  _limit = 10
): Promise<{ posts: Post[]; total: number }> => {
  void _page;
  void _limit;
  const dtos = await api.get<unknown[]>(`/posts/user/${userId}`);
  const posts: Post[] = (dtos || []).map((p: unknown) => {
    const post = p as Record<string, unknown>;
    return {
      id: String(post.id),
      userId: String(post.userId ?? userId),
      content: String(post.content ?? ""),
      privacy: String(post.privacy ?? "open"),
      createdAt: String(post.createdAt ?? ""),
      updatedAt: String(post.updatedAt ?? post.createdAt ?? ""),
      comments: Array.isArray(post.comments) ? post.comments : [],
      reactions: Array.isArray(post.reactions) ? post.reactions : [],
      author: {
        id: String(post.userId ?? (post.user as Record<string, unknown>)?.id ?? ""),
        name: [(post.user as Record<string, unknown>)?.firstName, (post.user as Record<string, unknown>)?.lastName].filter(Boolean).join(" ") || String((post.user as Record<string, unknown>)?.username ?? ""),
        avatar: String((post.user as Record<string, unknown>)?.profileImage ?? (post.user as Record<string, unknown>)?.avatar ?? ""),
      },
      image: undefined,
    };
  });
  return { posts, total: posts.length };
};

export const createPost = async (data: CreatePostRequest & { userId: number; files?: File[]; privacy?: "public" | "friends" | "only_me" }): Promise<Post> => {
  const form = new FormData();
  form.append("userId", String(data.userId));
  form.append("content", data.content);
  const privacy = data.privacy === "public" || !data.privacy ? "open" : data.privacy;
  form.append("privacy", privacy);
  if (data.files && data.files.length) {
    for (const f of data.files) form.append("files", f);
  }
  const response = await api.post<unknown>("/posts/create", form);
  const res = response as Record<string, unknown>;
  return {
    id: String(res.id),
    userId: String(res.userId ?? data.userId),
    content: String(res.content),
    privacy: String(res.privacy ?? "open"),
    createdAt: String(res.createdAt),
    updatedAt: String(res.updatedAt ?? res.createdAt ?? ""),
    comments: Array.isArray(res.comments) ? res.comments : [],
    reactions: Array.isArray(res.reactions) ? res.reactions : [],
    author: { id: String(res.userId ?? (res.user as Record<string, unknown>)?.id ?? ""), name: "", avatar: "" },
    image: undefined,
  };
};

export const getUserProgress = async (): Promise<Progress[]> => {
  try {
    const rawUserId = localStorage.getItem("userId");
    const numericUserId = rawUserId ? Number(rawUserId) : NaN;

    if (!rawUserId || !Number.isFinite(numericUserId)) {
      console.warn("getUserProgress: userId not found in localStorage or invalid");
      return [];
    }

    let userClassesResponse: unknown;
    try {
      userClassesResponse = await api.get(`/users/${rawUserId}/classes`);
    } catch (error) {
      console.error("getUserProgress: failed to fetch user classes", error);
      return [];
    }

    let userClasses: Array<{
      classId: number;
      className?: string;
    }> = [];

    if (Array.isArray(userClassesResponse)) {
      userClasses = userClassesResponse as Array<{ classId: number; className?: string }>;
    } else if (userClassesResponse && typeof userClassesResponse === "object") {
      const response = userClassesResponse as Record<string, unknown>;
      if (Array.isArray(response.classes)) {
        userClasses = response.classes as Array<{ classId: number; className?: string }>;
      } else if (Array.isArray(response.data)) {
        userClasses = response.data as Array<{ classId: number; className?: string }>;
      }
    }

    if (userClasses.length === 0) {
      return [];
    }

    const progressList: Progress[] = [];

    for (const userClass of userClasses) {
      try {
        const stats: AttendanceStatsDto[] = await getAttendanceStats(userClass.classId);
        const studentStats = stats.find((s) => s.studentId === numericUserId);
        if (!studentStats) continue;

        let rate: number;
        if (studentStats.attendanceRate != null) {
          rate = studentStats.attendanceRate;
        } else if (studentStats.totalSessions > 0) {
          rate = (studentStats.attendedCount / studentStats.totalSessions) * 100;
        } else {
          rate = 0;
        }

        if (rate > 0 && rate <= 1) {
          rate = rate * 100;
        }

        const percentage = Math.max(0, Math.min(100, Math.round(rate)));
        const totalLessons = studentStats.totalSessions;
        const completedLessons = studentStats.attendedCount;

        progressList.push({
          courseName: userClass.className || `Lớp ${userClass.classId}`,
          percentage,
          totalLessons,
          completedLessons,
        });
      } catch (error) {
        console.warn(
          `getUserProgress: failed to load attendance stats for classId ${userClass.classId}`,
          error
        );
      }
    }

    return progressList;
  } catch (error) {
    console.error("getUserProgress: unexpected error", error);
    return [];
  }
};

export const getUserBadges = async (): Promise<Badge[]> => {
  return [
    {
      id: "1",
      name: "First Steps",
      icon: "🎯",
      description: "Complete your first lesson",
      earnedAt: "2024-01-15",
      color: "#3B82F6"
    },
    {
      id: "2", 
      name: "Code Warrior",
      icon: "⚔️",
      description: "Solve 50 coding challenges",
      earnedAt: "2024-02-20",
      color: "#EF4444"
    },
    {
      id: "3",
      name: "Streak Master",
      icon: "🔥",
      description: "Study for 7 consecutive days",
      earnedAt: "2024-03-10",
      color: "#F59E0B"
    },
    {
      id: "4",
      name: "Team Player",
      icon: "🤝",
      description: "Help 5 classmates",
      earnedAt: "2024-03-25",
      color: "#10B981"
    }
  ];
};
