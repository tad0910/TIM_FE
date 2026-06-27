const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const extractUrls = (text: string): string[] => {
  const matches = text.match(URL_REGEX);
  return matches || [];
};

export const hasUrls = (text: string): boolean => {
  return extractUrls(text).length > 0;
};

export const getFirstUrl = (text: string): string | null => {
  const urls = extractUrls(text);
  return urls.length > 0 ? urls[0] : null;
};

