const BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8081';

export interface LinkPreview {
  title: string;
  description: string;
  imageUrl: string;
  domain: string;
}

export const getLinkPreview = async (url: string): Promise<LinkPreview> => {
  try {
    const response = await fetch(`${BASE_URL}/link-preview?url=${encodeURIComponent(url)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Link preview error:', response.status, response.statusText);
      throw new Error(`Failed to fetch link preview: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link preview fetch failed:', error);
    throw error;
  }
};

