export const queryKeys = {
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    growth: (months?: number) => ["dashboard", "growth", months ?? 6] as const,
    pending: ["dashboard", "pending"] as const,
    schedule: ["dashboard", "schedule"] as const,
    jobLeads: ["dashboard", "job-leads"] as const,
  },
  grades: {
    gradebook: (
      classModuleId: number | null,
      page: number,
      size: number,
      options?: unknown
    ) => ["grades", "gradebook", classModuleId, page, size, options] as const,
    moduleHistory: (classModuleId: number | null) =>
      ["grades", "module-history", classModuleId] as const,
    gradeHistory: (gradeId: number | null) =>
      ["grades", "grade-history", gradeId] as const,
  },
  modules: {
    list: (params?: unknown) => ["admin", "modules", params] as const,
    detail: (id: string | number) => ["admin", "modules", "detail", id] as const,
    sessions: {
      root: (moduleId: string | number) =>
        ["admin", "modules", moduleId, "sessions"] as const,
      list: (moduleId: string | number, params?: unknown) =>
        ["admin", "modules", moduleId, "sessions", params] as const,
    },
  },
  classes: {
    list: (filters?: unknown) => ["classes", "list", filters] as const,
    detail: (id: string | number) => ["classes", "detail", id] as const,
  },
  forms: {
    list: (filters?: unknown) => ["forms", "list", filters] as const,
    templates: () => ["forms", "templates"] as const,
    detail: (formId: number | null) => ["forms", "detail", formId] as const,
    byClass: (classId: number | null, filters?: unknown) =>
      ["forms", "class", classId, filters] as const,
    byClassStudent: (classId: number | null, studentId: number | null, filters?: unknown) =>
      ["forms", "class", classId, "student", studentId, filters] as const,
  },
  tuition: {
    routes: () => ["tuition", "routes"] as const,
    receipts: (filters?: unknown) => ["tuition", "receipts", filters] as const,
  },
  coupons: {
    list: () => ["coupons", "list"] as const,
  },
  companies: {
    list: (params?: unknown) => ["admin", "companies", params] as const,
    detail: (id: string | number | null) => ["admin", "companies", "detail", id] as const,
  },
  users: {
    root: () => ["users"] as const,
    list: (params?: unknown) => ["users", "list", params] as const,
    detail: (id: number | null) => ["users", "detail", id] as const,
    deleted: (params?: unknown) => ["users", "deleted", params] as const,
  },
  jobs: {
    overview: (filters?: unknown) => ["jobs", "overview", filters] as const,
    classes: (filters?: unknown) => ["jobs", "classes", filters] as const,
    tracking: (classId: number | null) => ["jobs", "tracking", classId] as const,
    leads: (classId: number | null, studentId: number | null) =>
      ["jobs", "leads", classId, studentId] as const,
  },
  gamification: {
    badges: () => ["gamification", "badges"] as const,
    leaderboard: () => ["gamification", "leaderboard"] as const,
    myStats: () => ["gamification", "my-stats"] as const,
    userStats: (userId: number) => ["gamification", "user-stats", userId] as const,
    myPointLogs: (params?: { page?: number; size?: number }) =>
      ["gamification", "my-point-logs", params] as const,
    userPointLogs: (userId: number, params?: { page?: number; size?: number }) =>
      ["gamification", "user-point-logs", userId, params] as const,
    myAchievements: () => ["gamification", "my-achievements"] as const,
    userAchievements: (userId: number) => ["gamification", "user-achievements", userId] as const,
    ranking: {
      current: (params?: { size?: number }) => ["gamification", "ranking", "current", params] as const,
      monthly: (params?: { monthYear?: string; size?: number }) => ["gamification", "ranking", "monthly", params] as const,
    },
    pointTypes: {
      root: () => ["gamification", "point-types"] as const,
      list: (params?: { page?: number; size?: number }) => ["gamification", "point-types", "list", params] as const,
      detail: (id: number | null) => ["gamification", "point-types", "detail", id] as const,
    },
    behaviorGroups: {
      root: () => ["gamification", "behavior-groups"] as const,
      list: (params?: { page?: number; size?: number }) => ["gamification", "behavior-groups", "list", params] as const,
      all: () => ["gamification", "behavior-groups", "all"] as const,
      detail: (id: number | null) => ["gamification", "behavior-groups", "detail", id] as const,
    },
  },
  profile: {
    detail: (userId: string | number) => ["profile", "detail", userId] as const,
    coverImage: (userId: string | number) => ["profile", "cover-image", userId] as const,
    progress: () => ["profile", "progress"] as const,
  },
  posts: {
    user: (userId: string, params?: { page?: number; size?: number }) =>
      ["posts", "user", userId, params] as const,
    all: (params?: { page?: number; size?: number }) =>
      ["posts", "all", params] as const,
  },
  reactions: {
    postCounts: (postId: string) => ["reactions", "post-counts", postId] as const,
  },
  news: {
    featured: () => ["news", "featured"] as const,
    latest: () => ["news", "latest"] as const,
    tech: () => ["news", "tech"] as const,
  },
};
