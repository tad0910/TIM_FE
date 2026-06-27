import { create } from 'zustand';
import {
  getPointTypesPage,
  createPointType,
  updatePointType,
  deletePointType,
  type GamificationPointType,
  type PageResponse,
  type CreatePointTypeRequest,
  type UpdatePointTypeRequest,
} from '../services/gamificationApi';
import { getUserById } from '../services/userApi';

interface PointTypesPageData {
  content: GamificationPointType[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
  lastFetched: number;
}

interface PointTypeWithCreator extends GamificationPointType {
  creatorName?: string;
}

interface PointTypesState {
  pages: Record<string, PointTypesPageData>;
  loading: boolean;
  cacheTimeout: number;
  fetchPage: (page?: number, size?: number, forceRefresh?: boolean) => Promise<PointTypesPageData>;
  getPageData: (page: number, size: number) => { pointTypes: PointTypeWithCreator[]; totalPages: number; totalElements: number } | null;
  addPointType: (data: CreatePointTypeRequest, imageFile?: File) => Promise<GamificationPointType | null>;
  updatePointType: (id: number, data: UpdatePointTypeRequest, imageFile?: File) => Promise<GamificationPointType | null>;
  removePointType: (id: number) => Promise<boolean>;
  updatePointTypeInCache: (page: number, size: number, id: number, updated: PointTypeWithCreator) => void;
  removePointTypeFromCache: (page: number, size: number, id: number) => void;
  clearCache: () => void;
}

function pageKey(page: number, size: number) {
  return `${page}:${size}`;
}

export const usePointTypesStore = create<PointTypesState>((set, get) => ({
  pages: {},
  loading: false,
  cacheTimeout: 5 * 60 * 1000,

  fetchPage: async (page = 0, size = 5, forceRefresh = false) => {
    const key = pageKey(page, size);
    const cached = get().pages[key];
    const now = Date.now();
    if (!forceRefresh && cached && now - cached.lastFetched < get().cacheTimeout) {
      return cached;
    }

    set({ loading: true });
    try {
      const response = await getPointTypesPage(page, size);
      const data = response.content || [];

      const contentWithCreators = await Promise.all(
        data.map(async (pt) => {
          if (pt.createdBy) {
            try {
              const creator = await getUserById(pt.createdBy);
              return {
                ...pt,
                creatorName:
                  creator.firstName && creator.lastName
                    ? `${creator.firstName} ${creator.lastName}`
                    : creator.username || `User ${pt.createdBy}`,
              };
            } catch {
              return { ...pt, creatorName: `User ${pt.createdBy}` };
            }
          }
          return { ...pt, creatorName: '-' };
        })
      );

      const pageData: PointTypesPageData = {
        content: contentWithCreators,
        totalPages: response.totalPages ?? 0,
        totalElements: response.totalElements ?? contentWithCreators.length,
        page: response.number ?? page,
        size,
        lastFetched: now,
      };

      set((state) => ({
        pages: { ...state.pages, [key]: pageData },
      }));

      return pageData;
    } catch (error) {
      console.error('[usePointTypesStore] Failed to fetch point types', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addPointType: async (data, imageFile) => {
    try {
      const created = await createPointType(data, imageFile);
      set({ pages: {} });
      return created;
    } catch (error) {
      console.error('[usePointTypesStore] Failed to create point type', error);
      throw error;
    }
  },

  updatePointType: async (id, data, imageFile) => {
    try {
      const updated = await updatePointType(id, data, imageFile);
      set((state) => {
        const newPages: Record<string, PointTypesPageData> = {};
        Object.entries(state.pages).forEach(([k, pageData]) => {
          newPages[k] = {
            ...pageData,
            content: pageData.content.map((pt) => (pt.id === id ? { ...pt, ...updated } : pt)),
          };
        });
        return { pages: newPages };
      });
      return updated;
    } catch (error) {
      console.error('[usePointTypesStore] Failed to update point type', error);
      throw error;
    }
  },

  removePointType: async (id) => {
    try {
      await deletePointType(id);
      set((state) => {
        const newPages: Record<string, PointTypesPageData> = {};
        Object.entries(state.pages).forEach(([k, pageData]) => {
          newPages[k] = {
            ...pageData,
            content: pageData.content.filter((pt) => pt.id !== id),
          };
        });
        return { pages: newPages };
      });
      return true;
    } catch (error) {
      console.error('[usePointTypesStore] Failed to delete point type', error);
      throw error;
    }
  },

  getPageData: (page: number, size: number) => {
    const key = pageKey(page, size);
    const cached = get().pages[key];
    if (!cached) return null;
    return {
      pointTypes: cached.content as PointTypeWithCreator[],
      totalPages: cached.totalPages,
      totalElements: cached.totalElements,
    };
  },

  updatePointTypeInCache: (page: number, size: number, id: number, updated: PointTypeWithCreator) => {
    const key = pageKey(page, size);
    set((state) => {
      const pageData = state.pages[key];
      if (!pageData) return state;
      return {
        pages: {
          ...state.pages,
          [key]: {
            ...pageData,
            content: pageData.content.map((pt) => (pt.id === id ? { ...pt, ...updated } : pt)),
          },
        },
      };
    });
  },

  removePointTypeFromCache: (page: number, size: number, id: number) => {
    const key = pageKey(page, size);
    set((state) => {
      const pageData = state.pages[key];
      if (!pageData) return state;
      return {
        pages: {
          ...state.pages,
          [key]: {
            ...pageData,
            content: pageData.content.filter((pt) => pt.id !== id),
            totalElements: Math.max(0, pageData.totalElements - 1),
          },
        },
      };
    });
  },

  clearCache: () => set({ pages: {} }),
}));

