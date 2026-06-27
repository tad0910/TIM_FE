import { BASE_URL as DEFAULT_BASE_URL } from '../services/api';

export type SSEClientOptions<TPayload = unknown> = {
  baseUrl?: string;
  path: string;
  token?: string | null;
  params?: Record<string, string | number | boolean | null | undefined>;
  withCredentials?: boolean;
  onOpen?: () => void;
  onMessage?: (data: TPayload) => void;
  onError?: (event: Event) => void;
  enableReconnect?: boolean;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
};

export type SSEClient = {
  connect: () => void;
  close: () => void;
  isConnected: () => boolean;
  getRetryCount: () => number;
};

/**
 * Create a robust EventSource client with auto-reconnect/backoff.
 * Usage lifecycle (aligned with app flow):
 * - After login: call client.connect()
 * - On new messages: handle in onMessage
 * - On logout: call client.close()
 */
export function createSSEClient<TPayload = unknown>(options: SSEClientOptions<TPayload>): SSEClient {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL) as string;
  const withCredentials = options.withCredentials ?? true;
  const enableReconnect = options.enableReconnect ?? true;
  const maxRetries = options.maxRetries ?? Number.POSITIVE_INFINITY;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 1000;
  const retryMaxDelayMs = options.retryMaxDelayMs ?? 30000;

  let eventSource: EventSource | null = null;
  let manuallyClosed = false;
  let connected = false;
  let retryCount = 0;
  let reconnectTimer: number | null = null;
  let lastToken: string | null = null;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const buildUrl = () => {
    const fullPath = baseUrl.replace(/\/$/, '') + (options.path.startsWith('/') ? options.path : `/${options.path}`);
    const url = new URL(fullPath, window.location.origin);    const params = { ...(options.params || {}) } as Record<string, unknown>;
    const token = options.token ?? localStorage.getItem('auth_token');
    lastToken = token;
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const exp = payload.exp;
          const now = Math.floor(Date.now() / 1000);
          if (exp && now > exp) {
            console.warn('[SSE] Token is EXPIRED!', {
              expiresAt: new Date(exp * 1000).toISOString(),
              currentTime: new Date().toISOString(),
              expiredBy: Math.floor((now - exp) / 60) + ' minutes'
            });
          } else {
            console.log('[SSE] Token is valid, expires at:', new Date(exp * 1000).toISOString());
          }
        }
      } catch (e) {
        console.warn('[SSE] Could not parse token for expiry check:', e);
      }
    }
    
    if (token) {
      params['token'] = token;
      console.log('[SSE] Building URL with token:', {
        tokenPreview: token.substring(0, 20) + '...',
        tokenLength: token.length,
        url: url.toString().replace(token, 'TOKEN_HIDDEN')
      });
    } else {
      console.warn('[SSE] No token available for SSE connection!');
    }
    
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
    }
    
    const finalUrl = url.toString();
    console.log('[SSE] Final URL (token hidden):', finalUrl.replace(/token=[^&]*/, 'token=***'));
    return finalUrl;
  };

  const scheduleReconnect = () => {
    if (!enableReconnect || manuallyClosed) return;
    if (retryCount >= maxRetries) return;
    const exp = Math.min(retryMaxDelayMs, retryBaseDelayMs * Math.pow(2, retryCount));
    const jitter = Math.random() * 0.3 * exp;
    const delay = Math.floor(exp * 0.85 + jitter);
    reconnectTimer = (setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay) as unknown) as number;
  };

  const handleOpen = () => {
    connected = true;
    retryCount = 0;
    consecutiveFailures = 0;
    options.onOpen?.();
  };

  const handleError = (evt: Event) => {
    connected = false;
    options.onError?.(evt);
    
    const currentToken = localStorage.getItem('auth_token');
    if (currentToken === lastToken) {
      consecutiveFailures += 1;
    } else {
      consecutiveFailures = 0;
      lastToken = currentToken;
    }
    
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[SSE] Stopping reconnect after ${consecutiveFailures} consecutive failures with same token. Token may need to be refreshed by API service.`);
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
        eventSource = null;
      }
      return;
    }
    
    if (!manuallyClosed) {
      try {
        eventSource?.close();
      } catch {}
      eventSource = null;
      retryCount += 1;
      scheduleReconnect();
    }
  };

  const handleMessage = (evt: MessageEvent) => {
    const raw = evt.data;
    try {
      const parsed = JSON.parse(raw) as TPayload;
      options.onMessage?.(parsed);
    } catch {
      options.onMessage?.((raw as unknown) as TPayload);
    }
  };

  const connect = () => {
    if (eventSource) return;
    manuallyClosed = false;
    
    if (lastToken === null) {
      lastToken = localStorage.getItem('auth_token');
    }
    
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken === lastToken) {
        console.log('[SSE] Skipping reconnect due to too many consecutive failures. Waiting for token refresh.');
        return;
      }
      consecutiveFailures = 0;
    }
    
    const url = buildUrl();
    const es = new EventSource(url, { withCredentials });
    eventSource = es;

    es.addEventListener('message', handleMessage as EventListener);
    es.addEventListener('INIT', (e) => options.onMessage?.(((e as MessageEvent).data as unknown) as TPayload));
    es.addEventListener('NOTIFICATION', handleMessage as EventListener);

    es.addEventListener('open', handleOpen as EventListener);
    es.addEventListener('error', handleError as EventListener);
  };

  const handleStorageChange = (e: StorageEvent | CustomEvent) => {
    const newToken = e instanceof StorageEvent ? e.newValue : (e.detail?.token || localStorage.getItem('auth_token'));
    if (newToken && newToken !== lastToken && !manuallyClosed) {
      console.log('[SSE] Token updated, reconnecting with new token...');
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
        eventSource = null;
      }
      connected = false;
      retryCount = 0;
      consecutiveFailures = 0;
      setTimeout(() => connect(), 100);
    }
  };

  const handleTokenRefresh = (e: CustomEvent) => {
    handleStorageChange(e);
  };

  const close = () => {
    manuallyClosed = true;
    connected = false;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      try { eventSource.close(); } catch {}
      eventSource = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('token-refreshed', handleTokenRefresh as EventListener);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('token-refreshed', handleTokenRefresh as EventListener);
  }

  return {
    connect,
    close,
    isConnected: () => connected,
    getRetryCount: () => retryCount,
  };
}

export default createSSEClient;


