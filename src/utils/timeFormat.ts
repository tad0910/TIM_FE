/**
 * Parse date value from BE (could be array or string) to Date object
 * Handles both array format [y, m, d, hh, mm, ss] and ISO string format
 * @param dateValue - Date value from BE (array, string, Date, or null)
 * @returns Date object or null if invalid
 */
export const parseBackendDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  if (Array.isArray(dateValue)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = dateValue;
    // Comment UTC conversion - use local time instead
    // return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return new Date(year, month - 1, day, hour, minute, second);
  }

  if (typeof dateValue === "string") {
    const str = dateValue;

    if (str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    }

    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const [, y, mo, d, hh, mm, ss] = m;
      // Comment UTC conversion - use local time instead
      // return new Date(
      //   Date.UTC(
      //     Number(y),
      //     Number(mo) - 1,
      //     Number(d),
      //     Number(hh),
      //     Number(mm),
      //     Number(ss)
      //   )
      // );
      return new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss)
      );
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  return null;
};

/**
 * Format a date string to relative time (e.g., "5 phút trước", "2 giờ trước")
 * @param dateString - ISO date string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatRelativeTime = (
  dateString: string | Date,
  options: {
    locale?: string;
    showSeconds?: boolean;
    maxDays?: number;
  } = {}
): string => {
  const {
    locale = 'vi-VN',
    showSeconds = false,
    maxDays = 7
  } = options;

  console.debug('Using locale:', locale);

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return 'Vừa xong';
  }

  if (diffInSeconds < 60) {
    return showSeconds ? `${diffInSeconds} giây trước` : 'Vừa xong';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < maxDays) {
    return `${diffInDays} ngày trước`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} năm trước`;
};

/**
 * Format a date string to absolute time (e.g., "15:30", "15/03/2024")
 * @param dateString - ISO date string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatAbsoluteTime = (
  dateString: string | Date,
  options: {
    locale?: string;
    format?: 'time' | 'date' | 'datetime' | 'full';
    timezone?: string;
  } = {}
): string => {
  const {
    locale = 'vi-VN',
    format = 'datetime',
    timezone = 'Asia/Ho_Chi_Minh'
  } = options;

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    // Comment timezone - use local time instead
    // timeZone: timezone,
  };

  switch (format) {
    case 'time':
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
    case 'date':
      formatOptions.day = '2-digit';
      formatOptions.month = '2-digit';
      formatOptions.year = 'numeric';
      break;
    case 'datetime':
      formatOptions.day = '2-digit';
      formatOptions.month = '2-digit';
      formatOptions.year = 'numeric';
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
    case 'full':
      formatOptions.weekday = 'long';
      formatOptions.day = '2-digit';
      formatOptions.month = 'long';
      formatOptions.year = 'numeric';
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(date);
};

/**
 * Format a date string to smart time (relative for recent, absolute for older)
 * @param dateString - ISO date string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatSmartTime = (
  dateString: string | Date,
  options: {
    locale?: string;
    maxRelativeDays?: number;
    showSeconds?: boolean;
  } = {}
): string => {
  const {
    locale = 'vi-VN',
    maxRelativeDays = 3,
    showSeconds = false
  } = options;

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < maxRelativeDays) {
    return formatRelativeTime(dateString, { locale, showSeconds });
  }

  return formatAbsoluteTime(dateString, { locale, format: 'datetime' });
};

/**
 * Get time ago string with custom thresholds
 * @param dateString - ISO date string or Date object
 * @param thresholds - Custom time thresholds
 * @returns Formatted time string
 */
export const formatCustomTime = (
  dateString: string | Date,
  thresholds: {
    seconds?: number;
    minutes?: number;
    hours?: number;
    days?: number;
  } = {}
): string => {
  const {
    seconds = 60,
    minutes = 60,
    hours = 24,
    days = 7
  } = thresholds;

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < seconds) {
    return 'Vừa xong';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < minutes) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < hours) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < days) {
    return `${diffInDays} ngày trước`;
  }

  return formatAbsoluteTime(dateString, { format: 'date' });
};

/**
 * Check if a date is today
 * @param dateString - ISO date string or Date object
 * @returns boolean
 */
export const isToday = (dateString: string | Date): boolean => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Check if a date is yesterday
 * @param dateString - ISO date string or Date object
 * @returns boolean
 */
export const isYesterday = (dateString: string | Date): boolean => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return date.getDate() === yesterday.getDate() &&
         date.getMonth() === yesterday.getMonth() &&
         date.getFullYear() === yesterday.getFullYear();
};

/**
 * Format time for notifications (optimized for notification display)
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string optimized for notifications
 */
export const formatNotificationTime = (dateString: string | Date | number[] | null | undefined): string => {
  try {
    if (!dateString) return 'Vừa xong';
    
    const date = parseBackendDate(dateString);
    
    if (!date || isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return "Vừa xong";
    }
    
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
      return 'Vừa xong';
  }

  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} năm trước`;
  } catch (error) {
    console.error('Error formatting notification time:', error, dateString);
    return 'Vừa xong';
  }
};

export default {
  formatRelativeTime,
  formatAbsoluteTime,
  formatSmartTime,
  formatCustomTime,
  formatNotificationTime,
  isToday,
  isYesterday
};
