import { create } from 'zustand';
import {
  getAchievementLevels,
  getAchievementById,
  getAllPointTypes,
  type AchievementLevel,
  type GamificationAchievement,
  type GamificationPointType,
} from '../services/gamificationApi';

interface AchievementLevelsData {
  levels: AchievementLevel[];
  achievement: GamificationAchievement | null;
  pointTypes: GamificationPointType[];
  lastFetched: number | null;
}

interface AchievementLevelsState {
  cache: Record<number, AchievementLevelsData>;
  loading: Record<number, boolean>;
  cacheTimeout: number;
  fetchData: (achievementId: number, forceRefresh?: boolean) => Promise<void>;
  updateLevelInCache: (achievementId: number, levelId: number, updated: Partial<AchievementLevel>) => void;
  removeLevelFromCache: (achievementId: number, levelId: number) => void;
  addLevelToCache: (achievementId: number, level: AchievementLevel) => void;
  clearCache: (achievementId?: number) => void;
}

export const useAchievementLevelsStore = create<AchievementLevelsState>((set, get) => ({
  cache: {},
  loading: {},
  cacheTimeout: 5 * 60 * 1000,

  fetchData: async (achievementId: number, forceRefresh = false) => {
    const state = get();
    const cached = state.cache[achievementId];

    if (!forceRefresh && cached && cached.lastFetched) {
      const now = Date.now();
      const timeSinceLastFetch = now - cached.lastFetched;
      if (timeSinceLastFetch < state.cacheTimeout) {
        return;
      }
    }

    set((prev) => ({
      loading: { ...prev.loading, [achievementId]: true },
    }));

    try {
      const [levelsData, achievementData, pointTypesData] = await Promise.all([
        getAchievementLevels(achievementId),
        getAchievementById(achievementId),
        getAllPointTypes(),
      ]);

      set((prev) => ({
        cache: {
          ...prev.cache,
          [achievementId]: {
            levels: levelsData,
            achievement: achievementData,
            pointTypes: pointTypesData,
            lastFetched: Date.now(),
          },
        },
        loading: { ...prev.loading, [achievementId]: false },
      }));
    } catch (error) {
      console.error('Error fetching achievement levels:', error);
      set((prev) => ({
        loading: { ...prev.loading, [achievementId]: false },
      }));
      throw error;
    }
  },

  updateLevelInCache: (achievementId: number, levelId: number, updated: Partial<AchievementLevel>) => {
    set((prev) => {
      const cached = prev.cache[achievementId];
      if (!cached) return prev;

      return {
        cache: {
          ...prev.cache,
          [achievementId]: {
            ...cached,
            levels: cached.levels.map((level) =>
              level.id === levelId ? { ...level, ...updated } : level
            ),
          },
        },
      };
    });
  },

  removeLevelFromCache: (achievementId: number, levelId: number) => {
    set((prev) => {
      const cached = prev.cache[achievementId];
      if (!cached) return prev;

      return {
        cache: {
          ...prev.cache,
          [achievementId]: {
            ...cached,
            levels: cached.levels.filter((level) => level.id !== levelId),
          },
        },
      };
    });
  },

  addLevelToCache: (achievementId: number, level: AchievementLevel) => {
    set((prev) => {
      const cached = prev.cache[achievementId];
      if (!cached) return prev;

      return {
        cache: {
          ...prev.cache,
          [achievementId]: {
            ...cached,
            levels: [level, ...cached.levels],
          },
        },
      };
    });
  },

  clearCache: (achievementId?: number) => {
    if (achievementId) {
      set((prev) => {
        const newCache = { ...prev.cache };
        delete newCache[achievementId];
        return { cache: newCache };
      });
    } else {
      set({ cache: {} });
    }
  },
}));


