import { api } from './api';

export interface Blog {
  title: string;
  link: string;
  description: string;
  publishedDate?: string;
}

export const newsApi = {
  getLatest: async (): Promise<Blog[]> => api.get<Blog[]>('/news/latest'),
  getFeatured: async (): Promise<Blog[]> => api.get<Blog[]>('/news/featured'),
  getTech: async (): Promise<Blog[]> => api.get<Blog[]>('/news/tech'),
};
