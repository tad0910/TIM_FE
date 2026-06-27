import { BASE_URL } from '../services/api';

export const resolveMediaUrl = (url?: string | null, base: string = BASE_URL): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) {
    const normalizedBase = base.replace(/\/$/, '');
    return `${normalizedBase}${url}`;
  }
  return url;
};
