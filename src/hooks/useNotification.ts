import { useState, useCallback } from 'react';
import type { Notification } from '../components/NotificationPopup';
import { DEFAULT_ERROR_MESSAGE, getErrorMessage } from '../utils/error';

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback((
    type: Notification['type'],
    title: string,
    message?: string,
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotification({
      id,
      type,
      title,
      message: message || '',
      duration
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('success', title, message, duration);
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('error', title, message, duration);
  }, [showNotification]);

  const showApiError = useCallback((
    error: unknown,
    fallback: string = DEFAULT_ERROR_MESSAGE,
    title = 'Lỗi',
    duration?: number,
  ) => {
    const message = getErrorMessage(error, fallback);
    showNotification('error', title, message, duration);
    return message;
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('warning', title, message, duration);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('info', title, message, duration);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError
  };
};
