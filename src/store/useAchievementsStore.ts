import { create } from 'zustand';
import { getAchievementsPage, type GamificationAchievement, type PageResponse } from '../services/gamificationApi';
import { getUserById } from '../services/userApi';

interface AchievementWithCreator extends GamificationAchievement {
  creatorName?: string;
}

interface AchievementsPageData {
  achievements: AchievementWithCreator[];
  lastFetched: number;
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

interface AchievementsState {
  achievements: AchievementWithCreator[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  cacheTimeout: number;
  pages: Record<string, AchievementsPageData>;
  fetchAchievements: (page?: number, size?: number, forceRefresh?: boolean) => Promise<void>;
  getPageData: (page: number, size: number) =>
    | { achievements: AchievementWithCreator[]; totalPages: number; totalElements: number }
    | null;
  updateAchievementInCache: (id: number, updated: Partial<GamificationAchievement>) => void;
  removeAchievementFromCache: (id: number) => void;
  addAchievementToCache: (achievement: GamificationAchievement) => Promise<void>;
  clearCache: () => void;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  achievements: [],
  loading: false,
  page: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 5,
  cacheTimeout: 5 * 60 * 1000,
  pages: {},

  fetchAchievements: async (page = 0, size = 5, forceRefresh = false) => {
    const { cacheTimeout, pages } = get();
    const now = Date.now();
    const key = `${page}:${size}`;
    const cached = pages[key];

    if (!forceRefresh && cached && now - cached.lastFetched < cacheTimeout) {
      set({
        achievements: cached.achievements,
        page: cached.page,
        pageSize: cached.size,
        totalPages: cached.totalPages,
        totalElements: cached.totalElements,
        loading: false,
      });
      return;
    }

    set({ loading: true, pageSize: size });
    try {
      const response: PageResponse<GamificationAchievement> = await getAchievementsPage(page, size);

      const achievementsWithCreators = await Promise.all(
        (response.content || []).map(async (achievement) => {
          if (achievement.createdBy) {
            try {
              const creator = await getUserById(achievement.createdBy);
              const creatorName =
                creator.firstName && creator.lastName
                  ? `${creator.firstName} ${creator.lastName}`
                  : creator.username || `User ${achievement.createdBy}`;
              return { ...achievement, creatorName };
            } catch (error) {
              console.error(`Failed to fetch creator for achievement ${achievement.id}:`, error);
              return { ...achievement, creatorName: `User ${achievement.createdBy}` };
            }
          }
          return { ...achievement, creatorName: '-' };
        }),
      );

      const safeTotalElements = response.totalElements ?? achievementsWithCreators.length;
      const safeTotalPages =
        response.totalPages ??
        (safeTotalElements && size ? Math.ceil(safeTotalElements / size) : 0);

      const pageData: AchievementsPageData = {
        achievements: achievementsWithCreators,
        lastFetched: now,
        totalElements: safeTotalElements,
        totalPages: safeTotalPages,
        page: response.number ?? page,
        size,
      };

      set((state) => ({
        achievements: achievementsWithCreators,
        page: pageData.page,
        totalPages: safeTotalPages,
        totalElements: safeTotalElements,
        loading: false,
        pages: { ...state.pages, [key]: pageData },
      }));
    } catch (error) {
      console.error('Error fetching achievements:', error);
      set({ loading: false });
      throw error;
    }
  },

  getPageData: (page: number, size: number) => {
    const key = `${page}:${size}`;
    const cached = get().pages[key];
    if (!cached) return null;
    return {
      achievements: cached.achievements,
      totalPages: cached.totalPages,
      totalElements: cached.totalElements,
    };
  },

  updateAchievementInCache: (id: number, updated: Partial<GamificationAchievement>) => {
    set((state) => {
      const updatedList = state.achievements.map((achievement) =>
        achievement.id === id ? { ...achievement, ...updated } : achievement
      );
      const key = `${state.page}:${state.pageSize}`;
      const cached = state.pages[key];
      return {
        achievements: updatedList,
        pages: cached
          ? {
              ...state.pages,
              [key]: { ...cached, achievements: updatedList },
            }
          : state.pages,
      };
    });
  },

  removeAchievementFromCache: (id: number) => {
    set((state) => {
      const updatedList = state.achievements.filter((achievement) => achievement.id !== id);
      const key = `${state.page}:${state.pageSize}`;
      const cached = state.pages[key];
      return {
        achievements: updatedList,
        totalElements: Math.max(0, state.totalElements - 1),
        pages: cached
          ? {
              ...state.pages,
              [key]: { ...cached, achievements: updatedList, totalElements: Math.max(0, cached.totalElements - 1) },
            }
          : state.pages,
      };
    });
  },

  addAchievementToCache: async (achievement: GamificationAchievement) => { 
    let creatorName = '-';
    if (achievement.createdBy) {
      try {
        const creator = await getUserById(achievement.createdBy);
        creatorName =
          creator.firstName && creator.lastName
            ? `${creator.firstName} ${creator.lastName}`
            : creator.username || `User ${achievement.createdBy}`;
      } catch (error) {
        console.error(`Failed to fetch creator for achievement ${achievement.id}:`, error);
        creatorName = `User ${achievement.createdBy}`;
      }
    }

    set((state) => ({
      achievements: [{ ...achievement, creatorName }, ...state.achievements],
      pages: (() => {
        const key = `${state.page}:${state.pageSize}`;
        const cached = state.pages[key];
        if (!cached) return state.pages;
        return {
          ...state.pages,
          [key]: {
            ...cached,
            achievements: [{ ...achievement, creatorName }, ...cached.achievements],
            totalElements: cached.totalElements + 1,
          },
        };
      })(),
      totalElements: state.totalElements + 1,
    }));
  },

  clearCache: () => {
    set({
      achievements: [],
      page: 0,
      totalPages: 0,
      totalElements: 0,
      pages: {},
    });
  },
}));


