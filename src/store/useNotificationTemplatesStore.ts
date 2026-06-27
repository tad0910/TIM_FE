import { create } from 'zustand';
import {
  getNotificationTemplatesPage,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  type NotificationTemplate,
  type CreateNotificationTemplateRequest,
  type UpdateNotificationTemplateRequest,
} from '../services/gamificationApi';

interface NotificationTemplatesPageData {
  templates: NotificationTemplate[];
  lastFetched: number;
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

interface NotificationTemplatesState {
  templates: NotificationTemplate[];
  loading: boolean;
  cacheTimeout: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  pages: Record<string, NotificationTemplatesPageData>;
  fetchTemplates: (page?: number, size?: number, forceRefresh?: boolean) => Promise<void>;
  getPageData: (page: number, size: number) =>
    | { templates: NotificationTemplate[]; totalPages: number; totalElements: number }
    | null;
  addTemplate: (data: CreateNotificationTemplateRequest, iconFile?: File) => Promise<NotificationTemplate | null>;
  updateTemplate: (id: number, data: UpdateNotificationTemplateRequest, iconFile?: File) => Promise<NotificationTemplate | null>;
  removeTemplate: (id: number) => Promise<boolean>;
  clearCache: () => void;
}

export const useNotificationTemplatesStore = create<NotificationTemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  cacheTimeout: 5 * 60 * 1000,
  page: 0,
  pageSize: 5,
  totalPages: 0,
  totalElements: 0,
  pages: {},

  fetchTemplates: async (page = 0, size = 5, forceRefresh = false) => {
    const { cacheTimeout, pages } = get();
    const now = Date.now();
    const key = `${page}:${size}`;
    const cached = pages[key];

    if (!forceRefresh && cached && now - cached.lastFetched < cacheTimeout) {
      set({
        templates: cached.templates,
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
      const resp = await getNotificationTemplatesPage(page, size);
      const data = resp.content || [];
      const safeTotalElements = resp.totalElements ?? data.length;
      const safeTotalPages =
        resp.totalPages ?? (safeTotalElements ? Math.ceil(safeTotalElements / size) : 0);

      const pageData: NotificationTemplatesPageData = {
        templates: data,
        lastFetched: now,
        totalElements: safeTotalElements,
        totalPages: safeTotalPages,
        page: resp.number ?? page,
        size,
      };

      set((state) => ({
        templates: data,
        page: pageData.page,
        pageSize: size,
        totalPages: safeTotalPages,
        totalElements: safeTotalElements,
        pages: { ...state.pages, [key]: pageData },
      }));
    } catch (error) {
      console.error('[useNotificationTemplatesStore] Failed to fetch templates', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getPageData: (page: number, size: number) => {
    const key = `${page}:${size}`;
    const cached = get().pages[key];
    if (!cached) return null;
    return {
      templates: cached.templates,
      totalPages: cached.totalPages,
      totalElements: cached.totalElements,
    };
  },

  addTemplate: async (data, iconFile) => {
    try {
      const created = await createNotificationTemplate(data, iconFile);
      set((state) => {
        const updatedPages: Record<string, NotificationTemplatesPageData> = {};
        Object.entries(state.pages).forEach(([key, pageData]) => {
          if (pageData.page === 0) {
            updatedPages[key] = {
              ...pageData,
              templates: [created, ...pageData.templates],
              totalElements: pageData.totalElements + 1,
            };
          } else {
            updatedPages[key] = {
              ...pageData,
              totalElements: pageData.totalElements + 1,
            };
          }
        });

        const currentKey = `${state.page}:${state.pageSize}`;
        const currentPage = state.pages[currentKey];
        const updatedTemplates = state.page === 0 && currentPage
          ? [created, ...state.templates]
          : state.templates;

        return {
          ...state,
          templates: updatedTemplates,
          totalElements: state.totalElements + 1,
          pages: Object.keys(updatedPages).length > 0 ? updatedPages : state.pages,
        };
      });
      return created;
    } catch (error) {
      console.error('[useNotificationTemplatesStore] Failed to create template', error);
      throw error;
    }
  },

  updateTemplate: async (id, data, iconFile) => {
    try {
      const updated = await updateNotificationTemplate(id, data, iconFile);
      set((state) => {
        const updatedPages: Record<string, NotificationTemplatesPageData> = {};
        Object.entries(state.pages).forEach(([key, pageData]) => {
          updatedPages[key] = {
            ...pageData,
            templates: pageData.templates.map((tpl) => (tpl.id === id ? updated : tpl)),
          };
        });

        const updatedTemplates = state.templates.map((tpl) => (tpl.id === id ? updated : tpl));

        return {
          ...state,
          templates: updatedTemplates,
          pages: Object.keys(updatedPages).length > 0 ? updatedPages : state.pages,
        };
      });
      return updated;
    } catch (error) {
      console.error('[useNotificationTemplatesStore] Failed to update template', error);
      throw error;
    }
  },

  removeTemplate: async (id) => {
    try {
      await deleteNotificationTemplate(id);
      set((state) => {
        const updatedPages: Record<string, NotificationTemplatesPageData> = {};
        Object.entries(state.pages).forEach(([key, pageData]) => {
          updatedPages[key] = {
            ...pageData,
            templates: pageData.templates.filter((tpl) => tpl.id !== id),
            totalElements: Math.max(0, pageData.totalElements - 1),
          };
        });

        const filtered = state.templates.filter((tpl) => tpl.id !== id);

        return {
          ...state,
          templates: filtered,
          totalElements: Math.max(0, state.totalElements - 1),
          pages: Object.keys(updatedPages).length > 0 ? updatedPages : state.pages,
        };
      });
      return true;
    } catch (error) {
      console.error('[useNotificationTemplatesStore] Failed to delete template', error);
      throw error;
    }
  },

  clearCache: () =>
    set({
      templates: [],
      page: 0,
      pageSize: 5,
      totalPages: 0,
      totalElements: 0,
      pages: {},
    }),
}));

