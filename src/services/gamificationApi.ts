import { api } from "./api";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export interface AwardPointsRequest {
  userId: number;
  behaviorId: number;
}

export interface AwardPointsResponse {
  userId: number;
  pointsDiligenceEarned?: number;
  pointsCompetenceEarned?: number;
  pointsExperienceEarned?: number;
  totalDiligence?: number;
  totalCompetence?: number;
  totalExperience?: number;
  newlyUnlockedAchievements?: UserAchievement[];
  message?: string;
}

export interface UserGamificationStats {
  userId: number;
  totalDiligence: number;
  totalCompetence: number;
  totalExperience: number;
  updatedAt?: string;
}

export interface UserPointLog {
  id: number;
  userId: number;
  behaviorId?: number;
  behaviorName?: string;
  pointsDiligenceEarned?: number;
  pointsCompetenceEarned?: number;
  pointsExperienceEarned?: number;
  createdAt?: string;
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievementLevelId?: number;
  achievementName?: string;
  levelName?: string;
  unlockedAt?: string;
  isDisplayed?: boolean;
}

export type RankingSortBy = "experience" | "competence" | "diligence" | "total";

export interface RankingItem {
  userId: number;
  username?: string;
  displayName?: string;
  profileImage?: string;
  totalDiligenceScore?: number;
  totalCompetenceScore?: number;
  totalExperienceScore?: number;
  rankPosition?: number;
  classId?: number;
  className?: string;
}

export interface RankingResponse {
  rankings: RankingItem[];
  total: number;
  page: number;
  size: number;
  sortBy?: RankingSortBy | string;
  monthYear?: string;
}

export interface RankingQueryParams {
  classId?: number;
  sortBy?: RankingSortBy;
  page?: number;
  size?: number;
}

export interface RankingMonthlyQueryParams extends RankingQueryParams {
  monthYear: string;
}

export interface UserRankPosition {
  userId: number;
  username?: string;
  totalDiligenceScore?: number;
  totalCompetenceScore?: number;
  totalExperienceScore?: number;
  rankPosition?: number;
  totalUsers?: number;
  monthYear?: string;
  classId?: number;
  className?: string;
}

export interface GamificationGuide {
  id: number;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  title: string;
  iconUrl?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateNotificationTemplateRequest = Pick<
  NotificationTemplate,
  "name" | "title" | "content"
> & { iconUrl?: string };

export type UpdateNotificationTemplateRequest = Partial<CreateNotificationTemplateRequest>;

export interface GamificationPointType {
  id: number;
  name: string;
  description?: string;
  maxPoints?: number;
  imageUrl?: string;
  isActive?: boolean;
  showOnDashboard?: boolean;
  createdBy?: number;
  createdAt: string;
}

export interface CreatePointTypeRequest {
  name: string;
  description?: string;
  maxPoints?: number;
  imageUrl?: string;
  isActive?: boolean;
  showOnDashboard?: boolean;
  createdBy?: number;
}

export interface UpdatePointTypeRequest {
  name?: string;
  description?: string;
  maxPoints?: number;
  imageUrl?: string;
  isActive?: boolean;
  showOnDashboard?: boolean;
}

export const getPointTypesPage = async (
  page = 0,
  size = 10
): Promise<PageResponse<GamificationPointType>> => {
  return api.get<PageResponse<GamificationPointType>>(
    "/gamification/point-types",
    { page, size }
  );
};

export const getAllPointTypes = async (): Promise<GamificationPointType[]> => {
  const response = await getPointTypesPage(0, 1000);
  return response.content || [];
};

export const getPointTypeById = async (
  id: number
): Promise<GamificationPointType> => {
  return api.get<GamificationPointType>(`/gamification/point-types/${id}`);
};

export const createPointType = async (
  data: CreatePointTypeRequest,
  imageFile?: File
): Promise<GamificationPointType> => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.maxPoints !== undefined)
    formData.append("maxPoints", data.maxPoints.toString());
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.isActive !== undefined)
    formData.append("isActive", data.isActive.toString());
  if (data.showOnDashboard !== undefined)
    formData.append("showOnDashboard", data.showOnDashboard.toString());
  if (data.createdBy) formData.append("createdBy", data.createdBy.toString());
  if (imageFile) formData.append("imageFile", imageFile);

  return api.post<GamificationPointType>("/gamification/point-types", formData);
};

export const updatePointType = async (
  id: number,
  data: UpdatePointTypeRequest,
  imageFile?: File
): Promise<GamificationPointType> => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.maxPoints !== undefined)
    formData.append("maxPoints", data.maxPoints.toString());
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.isActive !== undefined)
    formData.append("isActive", data.isActive.toString());
  if (data.showOnDashboard !== undefined)
    formData.append("showOnDashboard", data.showOnDashboard.toString());
  if (imageFile) formData.append("imageFile", imageFile);

  return api.put<GamificationPointType>(
    `/gamification/point-types/${id}`,
    formData
  );
};

export const deletePointType = async (id: number): Promise<void> => {
  return api.delete<void>(`/gamification/point-types/${id}`);
};

export const getNotificationTemplates = async (
  name?: string
): Promise<NotificationTemplate[]> => {
  const query = name ? { name } : undefined;
  const response = await api.get<any>("/notification-templates/all", query);
  if (Array.isArray(response)) {
    return response;
  }
  if (response && response.content && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
};

export const getNotificationTemplateById = async (
  id: number
): Promise<NotificationTemplate> => {
  return api.get<NotificationTemplate>(`/notification-templates/${id}`);
};

export const getNotificationTemplatesPage = async (
  page = 0,
  size = 10,
  name?: string
): Promise<PageResponse<NotificationTemplate>> => {
  const query: Record<string, string | number> = { page, size };
  if (name) query.name = name;
  const response = await api.get<any>("/notification-templates/all", query);

  if (response && Array.isArray(response.content)) {
    const totalElements = response.totalElements ?? response.content.length;
    const totalPages =
      response.totalPages ?? (totalElements ? Math.ceil(totalElements / size) : 0);
    return {
      content: response.content,
      totalElements,
      totalPages,
      size: response.size ?? size,
      number: response.number ?? page,
      first: response.first ?? page === 0,
      last: response.last ?? page >= totalPages - 1,
      numberOfElements: response.numberOfElements ?? response.content.length,
    };
  }

  if (Array.isArray(response)) {
    const totalElements = response.length;
    const totalPages = Math.ceil(totalElements / size);
    return {
      content: response.slice(page * size, page * size + size),
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
      numberOfElements: Math.min(size, totalElements - page * size),
    };
  }

  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size,
    number: page,
    first: true,
    last: true,
    numberOfElements: 0,
  };
};

export const createNotificationTemplate = async (
  data: CreateNotificationTemplateRequest,
  iconFile?: File
): Promise<NotificationTemplate> => {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("title", data.title);
  formData.append("content", data.content);
  if (iconFile) {
    formData.append("iconFile", iconFile);
  } else if (data.iconUrl) {
    formData.append("iconUrl", data.iconUrl);
  }
  return api.post<NotificationTemplate>("/notification-templates/create", formData);
};

export const updateNotificationTemplate = async (
  id: number,
  data: UpdateNotificationTemplateRequest,
  iconFile?: File
): Promise<NotificationTemplate> => {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.title) formData.append("title", data.title);
  if (data.content) formData.append("content", data.content);
  if (iconFile) {
    formData.append("iconFile", iconFile);
  } else if (data.iconUrl) {
    formData.append("iconUrl", data.iconUrl);
  }
  return api.put<NotificationTemplate>(`/notification-templates/${id}`, formData);
};

export const deleteNotificationTemplate = async (id: number): Promise<void> => {
  return api.delete<void>(`/notification-templates/${id}`);
};

export const awardPoints = async (
  data: AwardPointsRequest
): Promise<AwardPointsResponse> => {
  return api.post<AwardPointsResponse>("/gamification/award-points", data);
};

export const getMyGamificationStats =
  async (): Promise<UserGamificationStats> => {
    return api.get<UserGamificationStats>("/gamification/my-stats");
  };

export const getUserGamificationStats = async (
  userId: number
): Promise<UserGamificationStats> => {
  return api.get<UserGamificationStats>(`/gamification/users/${userId}/stats`);
};

export const getMyPointLogsPage = async (
  page = 0,
  size = 10
): Promise<PageResponse<UserPointLog>> => {
  return api.get<PageResponse<UserPointLog>>("/gamification/my-point-logs", {
    page,
    size,
  });
};

export const getUserPointLogsPage = async (
  userId: number,
  page = 0,
  size = 10
): Promise<PageResponse<UserPointLog>> => {
  return api.get<PageResponse<UserPointLog>>(
    `/gamification/users/${userId}/point-logs`,
    { page, size }
  );
};

export const getMyAchievementsPage = async (
  page = 0,
  size = 10
): Promise<PageResponse<UserAchievement>> => {
  return api.get<PageResponse<UserAchievement>>("/gamification/my-achievements", {
    page,
    size,
  });
};

export const getUserAchievementsPage = async (
  userId: number,
  page = 0,
  size = 10
): Promise<PageResponse<UserAchievement>> => {
  return api.get<PageResponse<UserAchievement>>(
    `/gamification/users/${userId}/achievements`,
    { page, size }
  );
};

export type BehaviorFrequencyType =
  | "UNLIMITED"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "ONCE";

export interface GamificationBehavior {
  id: number;
  groupId: number;
  groupName?: string;
  name: string;
  frequencyType: BehaviorFrequencyType;
  maxTimesPerFrequency?: number;
  pointDiligence?: number;
  pointCompetence?: number;
  pointExperience?: number;
  notificationTemplateDiligenceId?: number;
  notificationTemplateCompetenceId?: number;
  notificationTemplateExperienceId?: number;
  behaviorPointTypes?: BehaviorPointType[];
  createdAt?: string;
}

export interface BehaviorPointType {
  id?: number;
  pointTypeId: number;
  pointTypeName?: string;
  points?: number;
  notificationTemplateId?: number;
}

export interface GamificationBehaviorGroup {
  id: number;
  name: string;
  createdAt?: string;
  behaviors?: GamificationBehavior[];
}

export const getBehaviorGroupsPage = async (
  page = 0,
  size = 10
): Promise<PageResponse<GamificationBehaviorGroup>> => {
  return api.get<PageResponse<GamificationBehaviorGroup>>(
    "/gamification/behavior-groups",
    { page, size }
  );
};

export interface CreateBehaviorRequest {
  groupId: number;
  name: string;
  frequencyType: BehaviorFrequencyType;
  maxTimesPerFrequency?: number;
  pointDiligence?: number;
  pointCompetence?: number;
  pointExperience?: number;
  notificationTemplateDiligenceId?: number | null;
  notificationTemplateCompetenceId?: number | null;
  notificationTemplateExperienceId?: number | null;
  behaviorPointTypes?: BehaviorPointType[];
}

export type UpdateBehaviorRequest = Partial<CreateBehaviorRequest>;

export interface CreateBehaviorGroupRequest {
  name: string;
}

export type UpdateBehaviorGroupRequest = Partial<CreateBehaviorGroupRequest>;

export const getAllBehaviorGroups = async (): Promise<
  GamificationBehaviorGroup[]
> => {
  const response = await api.get<any>("/gamification/behavior-groups");
  if (Array.isArray(response)) {
    return response;
  }
  if (response && response.content && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
};

export const getBehaviorGroupById = async (
  id: number
): Promise<GamificationBehaviorGroup> => {
  return api.get<GamificationBehaviorGroup>(
    `/gamification/behavior-groups/${id}`
  );
};

export const createBehaviorGroup = async (
  data: CreateBehaviorGroupRequest
): Promise<GamificationBehaviorGroup> => {
  return api.post<GamificationBehaviorGroup>(
    "/gamification/behavior-groups",
    data
  );
};

export const updateBehaviorGroup = async (
  id: number,
  data: UpdateBehaviorGroupRequest
): Promise<GamificationBehaviorGroup> => {
  return api.put<GamificationBehaviorGroup>(
    `/gamification/behavior-groups/${id}`,
    data
  );
};

export const deleteBehaviorGroup = async (id: number): Promise<void> => {
  return api.delete<void>(`/gamification/behavior-groups/${id}`);
};

export const getBehaviorById = async (
  id: number
): Promise<GamificationBehavior> => {
  return api.get<GamificationBehavior>(`/gamification/behaviors/${id}`);
};

export const createBehavior = async (
  data: CreateBehaviorRequest
): Promise<GamificationBehavior> => {
  return api.post<GamificationBehavior>("/gamification/behaviors", data);
};

export const updateBehavior = async (
  id: number,
  data: UpdateBehaviorRequest
): Promise<GamificationBehavior> => {
  return api.put<GamificationBehavior>(`/gamification/behaviors/${id}`, data);
};

export const deleteBehavior = async (id: number): Promise<void> => {
  return api.delete<void>(`/gamification/behaviors/${id}`);
};

export interface GamificationAchievement {
  id: number;
  name: string;
  imageUrl?: string;
  createdBy?: number;
  createdAt: string;
}

export interface CreateAchievementRequest {
  name: string;
  imageUrl?: string;
  createdBy?: number;
}

export const getAchievementsPage = async (
  page = 0,
  size = 10
): Promise<PageResponse<GamificationAchievement>> => {
  return api.get<PageResponse<GamificationAchievement>>(
    "/gamification/achievements",
    { page, size }
  );
};
  
export const getAllAchievements = async (): Promise<GamificationAchievement[]> => {
  const response = await getAchievementsPage(0, 1000);
  return response.content || [];
};

export const getMyPointLogs = async (): Promise<UserPointLog[]> => {
  const response = await getMyPointLogsPage(0, 100);
  return response.content || [];
};

export const getUserPointLogs = async (userId: number): Promise<UserPointLog[]> => {
  const response = await getUserPointLogsPage(userId, 0, 100);
  return response.content || [];
};

export const getMyAchievements = async (): Promise<UserAchievement[]> => {
  const response = await getMyAchievementsPage(0, 100);
  return response.content || [];
};

export const getUserAchievements = async (userId: number): Promise<UserAchievement[]> => {
  const response = await getUserAchievementsPage(userId, 0, 100);
  return response.content || [];
};

// Achievement with Status DTOs
export interface AchievementLevelInfo {
  levelId: number;
  levelName: string;
  requiredPointTypeEnum?: string;
  minPointsRequired?: number;
  imageUrl?: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface AchievementWithStatus {
  achievementId: number;
  achievementName: string;
  achievementImageUrl?: string;
  description?: string;
  highestUnlockedLevelId?: number;
  highestUnlockedLevelName?: string;
  unlockedAt?: string;
  highestUnlockedLevelImageUrl?: string;
  nextLevelId?: number;
  nextLevelName?: string;
  nextLevelMinPoints?: number;
  nextLevelImageUrl?: string;
  currentPoints?: number;
  minPointsRequired?: number;
  maxPointsRequired?: number;
  progressPercentage?: number;
  isUnlocked: boolean;
  isFullyUnlocked: boolean;
  levels: AchievementLevelInfo[];
  rarityPercentage?: number;
}

export const getMyAchievementsWithStatus = async (): Promise<AchievementWithStatus[]> => {
  return api.get<AchievementWithStatus[]>("/gamification/my-achievements-with-status");
};

export const getUserAchievementsWithStatus = async (
  userId: number
): Promise<AchievementWithStatus[]> => {
  return api.get<AchievementWithStatus[]>(
    `/gamification/users/${userId}/achievements-with-status`
  );
};

export const getAchievementById = async (
  id: number
): Promise<GamificationAchievement> => {
  return api.get<GamificationAchievement>(`/gamification/achievements/${id}`);
};

export const createAchievement = async (
  data: CreateAchievementRequest,
  imageFile?: File
): Promise<GamificationAchievement> => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.createdBy) formData.append("createdBy", data.createdBy.toString());
  if (imageFile) formData.append("imageFile", imageFile);

  return api.post<GamificationAchievement>(
    "/gamification/achievements",
    formData
  );
};

export interface AchievementLevel {
  id: number;
  achievementId: number;
  achievementName?: string;
  levelName: string;
  requiredPointTypeId?: number;
  requiredPointTypeEnum?: string;
  minPointsRequired?: number;
  imageUrl?: string;
  notificationTemplateId?: number;
  createdAt: string;
}

export interface CreateAchievementLevelRequest {
  achievementId: number;
  levelName: string;
  requiredPointTypeId?: number;
  requiredPointTypeEnum?: string;
  minPointsRequired?: number;
  imageUrl?: string;
  notificationTemplateId?: number | null;
}

export const getAchievementLevels = async (
  achievementId: number
): Promise<AchievementLevel[]> => {
  const response = await api.get<any>(
    `/gamification/achievements/${achievementId}/levels`
  );
  if (Array.isArray(response)) {
    return response;
  }
  if (response && response.content && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
};

export const getAchievementLevelById = async (
  id: number
): Promise<AchievementLevel> => {
  return api.get<AchievementLevel>(`/gamification/achievement-levels/${id}`);
};

export const createAchievementLevel = async (
  data: CreateAchievementLevelRequest,
  imageFile?: File
): Promise<AchievementLevel> => {
  const formData = new FormData();

  if (data.achievementId)
    formData.append("achievementId", data.achievementId.toString());
  if (data.levelName) formData.append("levelName", data.levelName);
  if (data.requiredPointTypeId !== undefined)
    formData.append("requiredPointTypeId", data.requiredPointTypeId.toString());
  if (data.requiredPointTypeEnum)
    formData.append("requiredPointTypeEnum", data.requiredPointTypeEnum);
  if (data.minPointsRequired !== undefined)
    formData.append("minPointsRequired", data.minPointsRequired.toString());
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.notificationTemplateId !== undefined) {
    if (data.notificationTemplateId !== null) {
      formData.append("notificationTemplateId", data.notificationTemplateId.toString());
    } else {
      formData.append("notificationTemplateId", "");
    }
  }
  if (imageFile) formData.append("imageFile", imageFile);

  return api.post<AchievementLevel>(
    "/gamification/achievement-levels",
    formData
  );
};

export const updateAchievementLevel = async (
  id: number,
  data: CreateAchievementLevelRequest,
  imageFile?: File
): Promise<AchievementLevel> => {
  const formData = new FormData();

  if (data.achievementId)
    formData.append("achievementId", data.achievementId.toString());
  if (data.levelName) formData.append("levelName", data.levelName);
  if (data.requiredPointTypeId !== undefined)
    formData.append("requiredPointTypeId", data.requiredPointTypeId.toString());
  if (data.requiredPointTypeEnum)
    formData.append("requiredPointTypeEnum", data.requiredPointTypeEnum);
  if (data.minPointsRequired !== undefined)
    formData.append("minPointsRequired", data.minPointsRequired.toString());
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.notificationTemplateId !== undefined) {
    if (data.notificationTemplateId !== null) {
      formData.append("notificationTemplateId", data.notificationTemplateId.toString());
    } else {
      formData.append("notificationTemplateId", "");
    }
  }
  if (imageFile) formData.append("imageFile", imageFile);

  return api.put<AchievementLevel>(
    `/gamification/achievement-levels/${id}`,
    formData
  );
};

export const deleteAchievementLevel = async (id: number): Promise<void> => {
  return api.delete<void>(`/gamification/achievement-levels/${id}`);
};

export interface UpdateAchievementRequest {
  name?: string;
  imageUrl?: string;
}

export const updateAchievement = async (
  id: number,
  data: UpdateAchievementRequest,
  imageFile?: File
): Promise<GamificationAchievement> => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (imageFile) formData.append("imageFile", imageFile);

  return api.put<GamificationAchievement>(
    `/gamification/achievements/${id}`,
    formData
  );
};

export const deleteAchievement = async (id: number): Promise<void> => {
  return api.delete<void>(`/gamification/achievements/${id}`);
};

export const getCurrentRanking = async (
  params?: RankingQueryParams
): Promise<RankingResponse> => {
  const query = params
    ? {
        classId: params.classId,
        sortBy: params.sortBy,
        page: params.page,
        size: params.size,
      }
    : undefined;
  return api.get<RankingResponse>("/gamification/ranking/current", query);
};

export const getMonthlyRanking = async (
  params: RankingMonthlyQueryParams
): Promise<RankingResponse> => {
  const query = {
    monthYear: params.monthYear,
    classId: params.classId,
    sortBy: params.sortBy,
    page: params.page,
    size: params.size,
  };
  return api.get<RankingResponse>("/gamification/ranking/monthly", query);
};

export const getMyRankPosition = async (params?: {
  monthYear?: string;
  classId?: number;
  sortBy?: RankingSortBy;
}): Promise<UserRankPosition> => {
  return api.get<UserRankPosition>("/gamification/ranking/my-position", params);
};

export const createRankingSnapshot = async (
  monthYear?: string
): Promise<void> => {
  const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : "";
  return api.post<void>(`/gamification/ranking/snapshot${query}`);
};

const createGuideFormData = (file?: File): FormData => {
  const formData = new FormData();
  if (file) {
    formData.append("guideFile", file);
  }
  return formData;
};

export const uploadGamificationGuide = async (
  file: File
): Promise<GamificationGuide> => {
  const formData = createGuideFormData(file);
  return api.post<GamificationGuide>("/gamification/guide/upload", formData);
};

export const updateGamificationGuide = async (
  id: number,
  file?: File
): Promise<GamificationGuide> => {
  const formData = createGuideFormData(file);
  return api.put<GamificationGuide>(`/gamification/guide/${id}`, formData);
};

export const getActiveGamificationGuide =
  async (): Promise<GamificationGuide> => {
    return api.get<GamificationGuide>("/gamification/guide");
  };

export const getGamificationGuideById = async (
  id: number
): Promise<GamificationGuide> => {
  return api.get<GamificationGuide>(`/gamification/guide/${id}`);
};

export const getAllGamificationGuides = async (): Promise<
  GamificationGuide[]
> => {
  return api.get<GamificationGuide[]>("/gamification/guide/all");
};

export const deleteGamificationGuide = async (
  id: number
): Promise<{ message?: string }> => {
  return api.delete<{ message?: string }>(`/gamification/guide/${id}`);
};

export const deleteGamificationGuidePermanently = async (
  id: number
): Promise<{ message?: string }> => {
  return api.delete<{ message?: string }>(
    `/gamification/guide/${id}/permanent`
  );
};
