import { useEffect, useRef, useState, useCallback } from 'react';
import type { NotificationDTO } from '../services/notificationApi';

type UseNotificationStreamOptions = {
  enabled?: boolean;
  onInit?: (message: string) => void;
  onNotification?: (notification: NotificationDTO) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
};

type UseNotificationStreamReturn = {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
};

/**
 * Custom hook to initialize & manage SSE connection for notifications
 * - Connects to BE endpoint: /notifications/subscribe
 * - Listens for named events: INIT, NOTIFICATION
 * - Sends cookies and also appends token as query param for broader compatibility
 */
export function useNotificationStream(options: UseNotificationStreamOptions = {}): UseNotificationStreamReturn {
  const { enabled = true, onInit, onNotification, onError, onOpen } = options;

  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const getBaseUrl = () => {
    const base = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8081') as string;
    return base.replace(/\/$/, '');
  };

  const buildSubscribeUrl = () => {
    const base = getBaseUrl();
    const token = localStorage.getItem('auth_token') || '';
    const url = new URL(base + '/notifications/subscribe', window.location.origin);    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  };

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (_) {
      }
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const url = buildSubscribeUrl();
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setIsConnected(true);
      if (onOpen) onOpen();
    });

    es.addEventListener('error', (e) => {
      setIsConnected(false);
      if (onError) onError(e);
    });

    es.addEventListener('INIT', (evt) => {
      const data = (evt as MessageEvent<string>).data;
      if (onInit) onInit(data);
    });

    es.addEventListener('NOTIFICATION', (evt) => {
      try {
        const raw = (evt as MessageEvent<string>).data;
        const parsed: NotificationDTO = JSON.parse(raw);
        if (onNotification) onNotification(parsed);
      } catch (err) {
        try {
          const anyData = (evt as unknown as MessageEvent<unknown>).data as NotificationDTO;
          if (onNotification && anyData) onNotification(anyData);
        } catch (_) {
        }
      }
    });
  }, [cleanup, onInit, onNotification, onError, onOpen]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }
    connect();
    return () => {
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return { isConnected, connect, disconnect };
}

export default useNotificationStream;


