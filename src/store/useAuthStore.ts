import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  logoutAllDevices: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('userId', user.id);
        const currentMode = localStorage.getItem('auth_mode');
        if (currentMode !== 'keycloak') {
          localStorage.setItem('auth_mode', 'local');
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userId');
        localStorage.removeItem('auth_mode');
      },

      logoutAllDevices: async () => {
        try {
          const authMode = localStorage.getItem("auth_mode");
          
          if (authMode === "keycloak") {
            const { default: UserService } = await import('../modules/auth/services/keycloakService');
            await UserService.doLogout();
            return;
          } else {
            const base = (() => {
              if (typeof process !== 'undefined' && typeof process.env?.VITE_BASE_URL === 'string') {
                return process.env.VITE_BASE_URL;
              }
              if (typeof process !== 'undefined' && typeof process.env?.VITE_API_URL === 'string') {
                return process.env.VITE_API_URL;
              }
              if (typeof globalThis !== 'undefined') {
                const envLike = globalThis as Record<string, unknown>;
                const baseUrl = envLike?.VITE_BASE_URL ?? envLike?.VITE_API_URL;
                if (typeof baseUrl === 'string') {
                  return baseUrl;
                }
              }
              return 'http://localhost:8081';
            })();
            const res = await fetch(`${base.replace(/\/$/, '')}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(get().accessToken ? { 'Authorization': `Bearer ${get().accessToken}` } : {})
              },
              credentials: 'include'
            });

            if (!res.ok) {
              const text = await res.text().catch(() => '');
              throw new Error(text || `HTTP ${res.status}`);
            }

            get().logout();
            window.location.href = "/login?logout=true";
          }
          
        } catch (error) {
          console.error('Error during logout:', error);
          get().logout();
          
          const authMode = localStorage.getItem("auth_mode");
          if (authMode === "keycloak") {
            try {
              const { default: keycloak } = await import('../modules/auth/services/keycloak');
              if (keycloak.authenticated) {
                keycloak.logout({ 
                  redirectUri: window.location.origin + "/login?logout=true" 
                });
                return;
              }
            } catch (keycloakError) {
              console.error('Failed to clear Keycloak session:', keycloakError);
            }
          }
          
          alert('Đăng xuất thành công (local cleanup)!');
          window.location.href = "/login?logout=true";
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          return false;
        }

        try {
          const { refreshAccessToken } = await import('../modules/auth/services/authApi');
          const response = await refreshAccessToken(refreshToken);
          
          set({
            accessToken: response.accessToken,
          });
          localStorage.setItem('auth_token', response.accessToken);
          return true;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
