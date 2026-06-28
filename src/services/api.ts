import { ApiError, DEFAULT_ERROR_MESSAGE, parseErrorPayload } from "../utils/error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";


export const BASE_URL = (import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:8081")) as string;
const SIGNUP_PATH =
  (import.meta.env.VITE_SIGNUP_PATH as string) || "/auth/register";

const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_MODE_KEY = "auth_mode";
type AuthMode = "keycloak" | "local";

const isBrowser = typeof window !== "undefined";

const readAuthMode = (): AuthMode => {
  if (!isBrowser) {
    return "local";
  }

  const stored = localStorage.getItem(AUTH_MODE_KEY);
  return stored === "keycloak" ? "keycloak" : "local";
};

const readLocalStorageToken = (key: string): string | null => {
  if (!isBrowser) {
    return null;
  }

  return localStorage.getItem(key);
};

const resolveRefreshToken = (authMode: AuthMode): string | null => {
  if (authMode !== "local") {
    return null;
  }

  return readLocalStorageToken(REFRESH_TOKEN_KEY);
};

const resolveAccessToken = async (authMode: AuthMode): Promise<string | null> => {
  if (authMode === "keycloak") {
    try {
      const { default: KeycloakService } = await import(
        "../modules/auth/services/keycloakService"
      );
      const keycloakInstance = KeycloakService.getKeyCloack();

      if (!keycloakInstance?.authenticated) {
        return null;
      }

      if (typeof keycloakInstance.updateToken === "function") {
        try {
          await keycloakInstance.updateToken(30);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn("[api] Keycloak updateToken failed:", error);
          }
        }
      }

      return keycloakInstance.token ?? null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[api] Cannot resolve Keycloak token:", error);
      }
      return null;
    }
  }

  return readLocalStorageToken(AUTH_TOKEN_KEY);
};

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_BASE_URL && !import.meta.env.VITE_API_URL) {
    console.warn(
      "[api] Missing VITE_BASE_URL/VITE_API_URL. Falling back to http://localhost:8081"
    );
  }
  console.log("[api] Using API URL:", BASE_URL);
}

async function request<TResponse = unknown>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean | undefined | null>;
    noAutoRedirectOn401?: boolean;
  } = {}
): Promise<TResponse> {
  const method: HttpMethod = options.method ?? "GET";
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const authMode = readAuthMode();
  const accessToken = await resolveAccessToken(authMode);

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;

    if (import.meta.env.DEV) {
      console.log("[api] Authorization header set",
        `${headers["Authorization"].substring(0, 28)}...`
      );
    }

    if (authMode === "keycloak" && isBrowser) {
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      localStorage.setItem(AUTH_MODE_KEY, "keycloak");
    }
  } else if (import.meta.env.DEV) {
    console.log("[api] No access token available for request");
  }

  const isAbsolute = /^https?:\/\//i.test(path);
  const base = BASE_URL ? BASE_URL.replace(/\/$/, "") : "";
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = isAbsolute
      ? new URL(path)
      : new URL(`${base}${suffix}`, window.location.origin);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  if (import.meta.env.DEV) {
    console.log(`[api] ${method} ${url.toString()}`);
    if (options.body) {
      console.log("[api] Request body:", options.body);
    }
  }

  let body: string | FormData | undefined;
  if (method === "GET" || method === "DELETE") {
    body = undefined;
  } else if (options.body instanceof FormData) {
    body = options.body;
  } else {
    body = JSON.stringify(options.body ?? {});
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      method,
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchError: unknown) {
    clearTimeout(timeoutId);
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw fetchError;
    }
    throw fetchError;
  }

  if (import.meta.env.DEV) {
    console.log(`[api] Response status: ${resp.status}`);
  }

  let responseText: string | null = null;
  const readResponseText = async () => {
    if (responseText === null) {
      responseText = await resp.text().catch(() => "");
    }
    return responseText;
  };

  const throwApiError = async (status: number, fallback?: string) => {
    const raw = await readResponseText();
    const parsed = parseErrorPayload(
      raw && raw.trim() ? raw : fallback ?? DEFAULT_ERROR_MESSAGE,
      fallback ?? DEFAULT_ERROR_MESSAGE,
    );
    throw new ApiError(parsed.message || fallback || DEFAULT_ERROR_MESSAGE, status, raw || undefined, parsed.payload);
  };

  if (resp.status === 401) {
    if (options.noAutoRedirectOn401) {
      await throwApiError(resp.status, "Bạn không có quyền truy cập. Vui lòng đăng nhập lại.");
    }

    if (authMode === "keycloak") {
      if (import.meta.env.DEV) {
        console.warn("[api] Keycloak session expired. Triggering logout.");
      }

      try {
        const { default: KeycloakService } = await import(
          "../modules/auth/services/keycloakService"
        );
        await KeycloakService.doLogout();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[api] Failed to logout from Keycloak:", error);
        }

        if (isBrowser) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_MODE_KEY);
          window.location.href = "/login?relogin=true";
        }
      }

      throw new ApiError(
        "Phiên đăng nhập Keycloak đã hết hạn. Vui lòng đăng nhập lại.",
        401
      );
    }

    const refreshToken = resolveRefreshToken(authMode);
    if (!refreshToken) {
      if (import.meta.env.DEV) {
        console.warn("[api] No refresh token available for local mode");
      }
      if (isBrowser) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(AUTH_MODE_KEY);
        window.location.href = "/login?relogin=true";
      }
      throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
    }

    if (isRefreshing && refreshPromise) {
      try {
        const newToken = await refreshPromise;
        headers["Authorization"] = `Bearer ${newToken}`;
        resp = await fetch(url.toString(), {
          method,
          headers,
          body,
          credentials: "include",
        });
        if (import.meta.env.DEV) {
          console.log(`[api] Retry after waiting for refresh: ${resp.status}`);
        }
      } catch (waitError) {
        if (waitError instanceof Error && waitError.name === 'AbortError') {
          throw waitError;
        }
        if (import.meta.env.DEV) {
          console.error("[api] Failed while waiting for refresh:", waitError);
        }
        if (isBrowser) {
          window.location.href = "/login?relogin=true";
        }
        throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
      }
    } else {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          if (import.meta.env.DEV) {
            console.log("[api] Attempting to refresh token...");
          }
          const { refreshAccessToken } = await import(
            "../modules/auth/services/authApi"
          );
          const refreshResponse = await refreshAccessToken(refreshToken);

          if (isBrowser) {
            localStorage.setItem(AUTH_TOKEN_KEY, refreshResponse.accessToken);
            localStorage.setItem(AUTH_MODE_KEY, "local");
          }

          if (import.meta.env.DEV) {
            console.log(
              "[api] New token set:",
              refreshResponse.accessToken.substring(0, 28) + "..."
            );
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('token-refreshed', {
              detail: { token: refreshResponse.accessToken }
            }));
          }

          return refreshResponse.accessToken;
        } catch (refreshError) {
          if (refreshError instanceof Error && refreshError.name === "AbortError") {
            throw refreshError;
          }
          if (import.meta.env.DEV) {
            console.error("[api] Token refresh failed:", refreshError);
          }
          throw refreshError;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        const newToken = await refreshPromise;

        headers["Authorization"] = `Bearer ${newToken}`;
        if (import.meta.env.DEV) {
          console.log(
            "[api] Retry with new token:",
            headers["Authorization"].substring(0, 30) + "..."
          );
        }
        resp = await fetch(url.toString(), {
          method,
          headers,
          body,
          credentials: "include",
        });
        responseText = null;

        if (import.meta.env.DEV) {
          console.log(`[api] Retry response status: ${resp.status}`);
        }

        if (resp.status === 401) {
          if (import.meta.env.DEV) {
            console.error("[api] Retry still failed with 401, clearing tokens");
          }
          if (isBrowser) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(AUTH_MODE_KEY);
            window.location.href = "/login?relogin=true";
          }
          if (import.meta.env.DEV) {
            console.error("[api] 401 Error details:", await readResponseText());
          }
          await throwApiError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
      } catch (refreshError) {
        if (refreshError instanceof Error && refreshError.name === "AbortError") {
          throw refreshError;
        }
        if (import.meta.env.DEV) {
          console.error("[api] Token refresh process failed:", refreshError);
        }
        if (isBrowser) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(AUTH_MODE_KEY);
          window.location.href = "/login?relogin=true";
        }
        throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
      }
    }
  }

  if (resp.status === 403) {
    await throwApiError(403, "Bạn không có quyền thực hiện hành động này.");
  }

  if (!resp.ok) {
    await throwApiError(resp.status);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await resp.json()) as TResponse;
  }
  return (await resp.text()) as TResponse;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
}

export const api = {
  get: <T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
    headers?: Record<string, string>,
    noAutoRedirectOn401?: boolean
  ) => request<T>(path, { method: "GET", query, headers, noAutoRedirectOn401 }),
  post: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    noAutoRedirectOn401?: boolean
  ) => request<T>(path, { method: "POST", body, headers, noAutoRedirectOn401 }),
  put: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    noAutoRedirectOn401?: boolean
  ) => request<T>(path, { method: "PUT", body, headers, noAutoRedirectOn401 }),
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    noAutoRedirectOn401?: boolean
  ) =>
    request<T>(path, { method: "PATCH", body, headers, noAutoRedirectOn401 }),
  delete: <T = unknown>(
    path: string,
    headers?: Record<string, string>,
    noAutoRedirectOn401?: boolean
  ) => request<T>(path, { method: "DELETE", headers, noAutoRedirectOn401 }),

  signup: (data: SignupData) =>
    request<string>(SIGNUP_PATH, { method: "POST", body: data }),
};

export default api;
