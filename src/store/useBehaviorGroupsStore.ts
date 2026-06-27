import { create } from 'zustand';
import {
  getAllBehaviorGroups,
  getBehaviorGroupsPage,
  createBehaviorGroup,
  updateBehaviorGroup,
  deleteBehaviorGroup,
  createBehavior,
  updateBehavior,
  deleteBehavior,
  type GamificationBehaviorGroup,
  type GamificationBehavior,
  type CreateBehaviorGroupRequest,
  type UpdateBehaviorGroupRequest,
  type CreateBehaviorRequest,
  type UpdateBehaviorRequest,
} from '../services/gamificationApi';

interface BehaviorGroupsPageData {
  groups: GamificationBehaviorGroup[];
  lastFetched: number;
}

interface BehaviorGroupsState {
  groups: GamificationBehaviorGroup[];
  loading: boolean;
  lastFetched: number | null;
  cacheTimeout: number;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  pages: Record<string, BehaviorGroupsPageData>;
  fetchGroups: (forceRefresh?: boolean, page?: number, size?: number) => Promise<void>;
  addGroup: (data: CreateBehaviorGroupRequest) => Promise<GamificationBehaviorGroup | null>;
  updateGroup: (id: number, data: UpdateBehaviorGroupRequest) => Promise<GamificationBehaviorGroup | null>;
  removeGroup: (id: number) => Promise<boolean>;
  addBehavior: (data: CreateBehaviorRequest) => Promise<GamificationBehavior | null>;
  updateBehavior: (id: number, data: UpdateBehaviorRequest) => Promise<GamificationBehavior | null>;
  removeBehavior: (id: number, groupId?: number) => Promise<boolean>;
  replaceGroups: (groups: GamificationBehaviorGroup[]) => void;
  clearCache: () => void;
  addGroupToCache: (group: GamificationBehaviorGroup) => void;
  updateGroupInCache: (group: GamificationBehaviorGroup) => void;
  removeGroupFromCache: (id: number) => void;
  addBehaviorToCache: (groupId: number, behavior: GamificationBehavior) => void;
  updateBehaviorInCache: (groupId: number, behaviorId: number, behavior: GamificationBehavior) => void;
  removeBehaviorFromCache: (groupId: number, behaviorId: number) => void;
}

export const useBehaviorGroupsStore = create<BehaviorGroupsState>((set, get) => ({
  groups: [],
  loading: false,
  lastFetched: null,
  cacheTimeout: 5 * 60 * 1000,
  page: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 5,
  pages: {},

  fetchGroups: async (forceRefresh = false, page = 0, size = 5) => {
    const { cacheTimeout, pages } = get();
    const now = Date.now();
    const key = `${page}:${size}`;
    const cached = pages[key];

    if (!forceRefresh && cached && now - cached.lastFetched < cacheTimeout) {
      set({
        groups: cached.groups,
        page,
        pageSize: size,
        loading: false,
      });
      return;
    }

    set({ loading: true, pageSize: size });
    try {
      let data: GamificationBehaviorGroup[] = [];
      let totalElements = 0;
      let totalPages = 0;
      try {
        const resp = await getBehaviorGroupsPage(page, size);
        data = resp.content || [];
        totalElements = resp.totalElements ?? data.length;
        totalPages =
          resp.totalPages ?? (totalElements ? Math.ceil(totalElements / size) : 0);
      } catch (err) {
        const all = await getAllBehaviorGroups();
        data = Array.isArray(all) ? all : [];
        totalElements = data.length;
        totalPages = Math.ceil(totalElements / size);
      }

      set((state) => ({
        groups: data,
        lastFetched: now,
        page,
        totalPages,
        totalElements,
        pages: {
          ...state.pages,
          [key]: { groups: data, lastFetched: now },
        },
      }));
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to fetch behavior groups', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addGroup: async (data) => {
    try {
      const created = await createBehaviorGroup(data);
      set((state) => ({ groups: [...state.groups, { ...created, behaviors: created.behaviors ?? [] }] }));
      return created;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to create group', error);
      throw error;
    }
  },

  updateGroup: async (id, data) => {
    try {
      const updated = await updateBehaviorGroup(id, data);
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? { ...g, ...updated } : g)),
      }));
      return updated;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to update group', error);
      throw error;
    }
  },

  removeGroup: async (id) => {
    try {
      await deleteBehaviorGroup(id);
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
      }));
      return true;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to delete group', error);
      throw error;
    }
  },

  addBehavior: async (data) => {
    try {
      const created = await createBehavior(data);

      const { addBehaviorToCache } = get();
      addBehaviorToCache(data.groupId!, created);

      return created;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to create behavior', error);
      throw error;
    }
  },

  updateBehavior: async (id, data) => {
    try {
      const updated = await updateBehavior(id, data);
      set((state) => ({
        groups: state.groups.map((g) => ({
          ...g,
          behaviors: g.behaviors?.map((b) => (b.id === id ? { ...b, ...updated } : b)),
        })),
      }));
      return updated;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to update behavior', error);
      throw error;
    }
  },

  removeBehavior: async (id, _groupId) => {
    try {
      await deleteBehavior(id);
      set((state) => ({
        groups: state.groups.map((g) => ({
          ...g,
          behaviors: g.behaviors?.filter((b) => b.id !== id),
        })),
      }));
      return true;
    } catch (error) {
      console.error('[useBehaviorGroupsStore] Failed to delete behavior', error);
      throw error;
    }
  },

  replaceGroups: (groups) => set({ groups, lastFetched: Date.now() }),

  clearCache: () =>
    set({
      groups: [],
      lastFetched: null,
      page: 0,
      totalPages: 0,
      totalElements: 0,
      pages: {},
    }),

  addGroupToCache: (group: GamificationBehaviorGroup) => {
    set((state) => {
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      const updatedGroups = [...state.groups, { ...group, behaviors: group.behaviors ?? [] }];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },

  updateGroupInCache: (group: GamificationBehaviorGroup) => {
    set((state) => {
      const updatedGroups = state.groups.map((g) => (g.id === group.id ? { ...g, ...group } : g));
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },

  removeGroupFromCache: (id: number) => {
    set((state) => {
      const updatedGroups = state.groups.filter((g) => g.id !== id);
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },

  addBehaviorToCache: (groupId: number, behavior: GamificationBehavior) => {
    set((state) => {
      const updatedGroups = state.groups.map((g) =>
        g.id === groupId ? { ...g, behaviors: [...(g.behaviors ?? []), behavior] } : g,
      );
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },

  updateBehaviorInCache: (_groupId: number, behaviorId: number, behavior: GamificationBehavior) => {
    set((state) => {
      const updatedGroups = state.groups.map((g) => ({
        ...g,
        behaviors: g.behaviors?.map((b) => (b.id === behaviorId ? { ...b, ...behavior } : b)),
      }));
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },

  removeBehaviorFromCache: (_groupId: number, behaviorId: number) => {
    set((state) => {
      const updatedGroups = state.groups.map((g) => ({
        ...g,
        behaviors: g.behaviors?.filter((b) => b.id !== behaviorId),
      }));
      const currentKey = `${state.page}:${state.pageSize}`;
      const currentPage = state.pages[currentKey];
      return {
        groups: updatedGroups,
        pages: currentPage
          ? {
              ...state.pages,
              [currentKey]: { ...currentPage, groups: updatedGroups },
            }
          : state.pages,
      };
    });
  },
}));

