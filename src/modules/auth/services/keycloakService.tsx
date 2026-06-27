import keycloak from "./keycloak";
console.log("keycloakService loaded, imported keycloak:", keycloak);

let initPromise: Promise<boolean> | null = null;

const initKeycloak = (onAuthenticatedCallback: Function, _logout: Function) => {
  console.log("initKeycloak called. URL:", window.location.href);

  if (initPromise) {
    console.log("Keycloak initialization already in progress or completed.");
    initPromise.then(() => onAuthenticatedCallback());
    return;
  }



  initPromise = keycloak
    .init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: "S256",
      checkLoginIframe: false,
      enableLogging: true
    })
    .then(async (authenticated: boolean) => {
      console.log("Keycloak init result:", authenticated);

      if (authenticated) {
        console.log("Keycloak authentication successful");

        const tokenParsed = keycloak.tokenParsed;
        const email = tokenParsed?.email || tokenParsed?.preferred_username;

        if (email) {
          try {
            localStorage.setItem("auth_token", keycloak.token || "");
            localStorage.setItem("auth_mode", "keycloak");

            const { api } = await import('../../../services/api');
            const response = await api.get('/users');

            let usersToSearch: Array<{
              id: number;
              username: string;
              email: string;
              role?: string;
            }> = [];

            if (Array.isArray(response)) {
              usersToSearch = response;
            } else if (response && typeof response === 'object') {
              const r = response as any;
              if (Array.isArray(r.content)) {
                usersToSearch = r.content;
              } else if (Array.isArray(r.data)) {
                usersToSearch = r.data;
              }
            }

            console.log("Users fetched for sync:", usersToSearch.length);

            const currentUser = usersToSearch.find((u) =>
              u.email?.toLowerCase() === email.toLowerCase()
            );

            if (!currentUser) {
              console.warn('User not found in DB with email:', email);
            }

            if (currentUser) {
              const user = {
                id: currentUser.id.toString(),
                username: currentUser.username,
                email: currentUser.email,
                role: currentUser.role || 'USER'
              };

              const { useAuthStore } = await import('../../../store/useAuthStore');
              const { login } = useAuthStore.getState();

              login(user, keycloak.token || "", keycloak.refreshToken || "");

              console.log("Keycloak authentication completed successfully");
            }
          } catch (error) {
            console.error("Failed to authenticate with backend:", error);
          }
        } else {
          console.error("No email found in Keycloak token");
        }
      } else {
        console.log("Keycloak authentication failed or user not logged in");
      }
      onAuthenticatedCallback();
      return authenticated;
    })
    .catch((err) => {
      console.error("Keycloak init failed:", err);
      onAuthenticatedCallback();
      return false;
    });
};

const getKeyCloack = () => keycloak;

const doLogin = () => {
  console.log("Starting Keycloak login...");
  console.log("Current keycloak instance:", keycloak);
  if (!keycloak) {
    console.error("Keycloak instance is undefined!");
    return;
  }
  return keycloak.login({
    redirectUri: window.location.origin + "/",
  });
};

const clearLocalAuth = () => {
  try {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_mode");
    sessionStorage.clear();
  } catch (_) { }
};

const doLogout = async () => {
  try {
    clearLocalAuth();

    try {
      const { useAuthStore } = await import('../../../store/useAuthStore');
      useAuthStore.getState().logout();
    } catch (error) {
      console.warn('Failed to clear auth store:', error);
    }

    const authMode = localStorage.getItem("auth_mode");

    if (keycloak.authenticated && keycloak.token) {
      const userId = keycloak.tokenParsed?.sub;

      if (userId) {
        console.log('Calling backend Keycloak logout API for user:', userId);
        const base = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8081') as string;
        try {
          await fetch(`${base.replace(/\/$/, '')}/api/v1/keycloak/users/${userId}/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${keycloak.token}`
            },
            credentials: 'include'
          });
          console.log('Backend Keycloak logout successful');
        } catch (backendError) {
          console.warn('Backend Keycloak logout failed:', backendError);
        }
      }
    }

    if (authMode === "keycloak") {
      console.log("Forcing Keycloak logout redirect...");
      return keycloak.logout({
        redirectUri: window.location.origin + "/login?logout=true",
      } as any);
    }

    if (keycloak.authenticated) {
      return keycloak.logout({
        redirectUri: window.location.origin + "/login?logout=true",
      } as any);
    }

    clearLocalAuth();
    window.location.href = "/login?logout=true";
  } catch (error) {
    console.error('Error during Keycloak logout:', error);
    clearLocalAuth();
    window.location.href = "/login?logout=true";
  }
};

const doLogoutAllDevices = async () => {
  return doLogout();
};

const getToken = () => keycloak.token;

const isLoggedIn = () => {
  if (typeof window === "undefined") return false;
  const mode = localStorage.getItem("auth_mode");
  const localToken = localStorage.getItem("auth_token");

  console.log("isLoggedIn check - mode:", mode, "localToken:", !!localToken, "keycloak.authenticated:", keycloak.authenticated);

  if (mode === "local") {
    return Boolean(localToken);
  }

  if (mode === "keycloak") {
    return Boolean(keycloak.authenticated && keycloak.token);
  }

  if (!mode) {
    if (localToken) {
      return true;
    }
    if (keycloak.authenticated && keycloak.token) {
      return true;
    }
  }

  return false;
};

const getUsername = () => keycloak.tokenParsed?.realm_access;

const refreshAuthState = () => {
  const currentMode = localStorage.getItem("auth_mode");

  if (currentMode === "keycloak" && keycloak.authenticated && keycloak.token) {
    localStorage.setItem("auth_token", keycloak.token);
    localStorage.setItem("auth_mode", "keycloak");
    console.log("Keycloak auth state refreshed");
  } else if (currentMode === "local") {
    console.log("Local auth state maintained by auth store");
  } else {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_mode");
    console.log("Auth state cleared");
  }
};

const UserService = {
  initKeycloak,
  doLogin,
  doLogout,
  doLogoutAllDevices,
  clearLocalAuth,
  isLoggedIn,
  getToken,
  getUsername,
  refreshAuthState,
  getKeyCloack,
};

export default UserService;