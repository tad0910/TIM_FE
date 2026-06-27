
export const debugAuthState = async () => {
  console.log("=== AUTH DEBUG INFO ===");
  console.log("Current URL:", window.location.href);
  console.log("Current pathname:", window.location.pathname);
  console.log("Current search:", window.location.search);
  
  console.log("=== LOCALSTORAGE ===");
  console.log("auth_mode:", localStorage.getItem("auth_mode"));
  console.log("auth_token exists:", !!localStorage.getItem("auth_token"));
  console.log("auth_token length:", localStorage.getItem("auth_token")?.length || 0);
  console.log("refresh_token exists:", !!localStorage.getItem("refresh_token"));
  console.log("userId:", localStorage.getItem("userId"));
  console.log("user_info:", localStorage.getItem("user_info"));
  
  const authToken = localStorage.getItem("auth_token");
  if (authToken) {
    try {
      const parts = authToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log("=== TOKEN ANALYSIS ===");
        console.log("Token type: JWT");
        console.log("Token payload:", payload);
        console.log("Token expires at:", new Date(payload.exp * 1000));
        console.log("Token is expired:", Date.now() > payload.exp * 1000);
        console.log("Token issuer:", payload.iss);
        console.log("Token audience:", payload.aud);
        console.log("Token subject:", payload.sub);
      } else {
        console.log("=== TOKEN ANALYSIS ===");
        console.log("Token type: Not JWT (length:", authToken.length, ")");
        console.log("Token preview:", authToken.substring(0, 50) + "...");
      }
    } catch {
      console.log("=== TOKEN ANALYSIS ===");
      console.log("Token type: Not JWT or invalid format");
      console.log("Token preview:", authToken.substring(0, 50) + "...");
    }
  }
  
  try {
    const { useAuthStore } = await import('../store/useAuthStore');
    const authState = useAuthStore.getState();
    console.log("=== ZUSTAND AUTH STORE ===");
    console.log("isAuthenticated:", authState.isAuthenticated);
    console.log("user:", authState.user);
    console.log("accessToken exists:", !!authState.accessToken);
    console.log("refreshToken exists:", !!authState.refreshToken);
  } catch (error) {
    console.log("Could not access Zustand store:", error);
  }
  
  try {
    const { default: keycloak } = await import('../modules/auth/services/keycloak');
    console.log("=== KEYCLOAK ===");
    console.log("keycloak.authenticated:", keycloak.authenticated);
    console.log("keycloak.token exists:", !!keycloak.token);
    console.log("keycloak.token length:", keycloak.token?.length || 0);
  } catch (error) {
    console.log("Could not access Keycloak:", error);
  }
  
  try {
    const UserService = (await import('../modules/auth/services/keycloakService')).default;
    console.log("=== USER SERVICE ===");
    console.log("UserService.isLoggedIn():", UserService.isLoggedIn());
  } catch (error) {
    console.log("Could not access UserService:", error);
  }
  
  console.log("=== END AUTH DEBUG ===");
};

export const clearAllAuthData = async () => {
  console.log("Clearing all auth data...");
  
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("userId");
  localStorage.removeItem("auth_mode");
  localStorage.removeItem("user_info");
  
  try {
    const { useAuthStore } = await import('../store/useAuthStore');
    useAuthStore.getState().logout();
  } catch (error) {
    console.log("Could not clear Zustand store:", error);
  }
  
  try {
    const { default: keycloak } = await import('../modules/auth/services/keycloak');
    if (keycloak.authenticated) {
      keycloak.logout({ redirectUri: window.location.origin + "/login" });
    }
  } catch (error) {
    console.log("Could not clear Keycloak:", error);
  }
  
  console.log("All auth data cleared");
};

export const testAuthFlow = async () => {
  console.log("=== TESTING AUTH FLOW ===");
  
  console.log("1. Initial state:");
  await debugAuthState();
  
  console.log("2. Clearing all data:");
  await clearAllAuthData();
  
  console.log("3. After clear:");
  await debugAuthState();
  
  console.log("=== AUTH FLOW TEST COMPLETE ===");
};

export const testOAuth2Token = async () => {
  console.log("=== TESTING OAUTH2 TOKEN ===");
  
  const authToken = localStorage.getItem("auth_token");
  if (!authToken) {
    console.log("❌ No auth token found");
    return;
  }
  
  try {
    const parts = authToken.split('.');
    if (parts.length !== 3) {
      console.log("❌ Token is not JWT format");
      console.log("Token length:", authToken.length);
      console.log("Token preview:", authToken.substring(0, 100) + "...");
      return;
    }
    
    console.log("✅ Token is JWT format");
    
    const payload = JSON.parse(atob(parts[1]));
    console.log("Token payload:", payload);
    
    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp;
    const isExpired = now > exp;
    
    console.log("Current time:", now);
    console.log("Token expires:", exp);
    console.log("Is expired:", isExpired);
    
    if (isExpired) {
      console.log("❌ Token is expired");
      
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        console.log("Attempting to refresh token...");
        try {
          const { refreshAccessToken } = await import('../modules/auth/services/authApi');
          const newTokens = await refreshAccessToken(refreshToken);
          console.log("✅ Token refreshed successfully");
          localStorage.setItem("auth_token", newTokens.accessToken);
        } catch (error) {
          console.log("❌ Token refresh failed:", error);
        }
      } else {
        console.log("❌ No refresh token available");
      }
    } else {
      console.log("✅ Token is still valid");
    }
    
  } catch (error) {
    console.log("❌ Error analyzing token:", error);
  }
  
  console.log("=== OAUTH2 TOKEN TEST COMPLETE ===");
};

export const testApiCall = async () => {
  console.log("=== TESTING API CALL ===");
  
  try {
    const { api } = await import('../services/api');
    console.log("Testing API call to /users...");
    const result = await api.get('/users');
    console.log("✅ API call successful:", result);
  } catch (error) {
    console.log("❌ API call failed:", error);
  }
  
  console.log("=== API CALL TEST COMPLETE ===");
};

export const testLoginFlow = async (username: string, password: string) => {
  console.log("=== TESTING LOGIN FLOW ===");
  console.log("Username:", username);
  console.log("Password:", password ? "***" : "empty");
  
  try {
    console.log("Step 1: Testing login API...");
    const { loginWithUsernamePassword } = await import('../modules/auth/services/authApi');
    const loginResult = await loginWithUsernamePassword(username, password);
    console.log("✅ Login API successful:", {
      hasAccessToken: !!loginResult.accessToken,
      hasRefreshToken: !!loginResult.refreshToken,
      accessTokenLength: loginResult.accessToken?.length || 0
    });
    
    console.log("Step 2: Saving tokens...");
    localStorage.setItem('auth_token', loginResult.accessToken);
    localStorage.setItem('refresh_token', loginResult.refreshToken);
    localStorage.setItem('auth_mode', 'local');
    console.log("✅ Tokens saved");
    
    console.log("Step 3: Testing API call with new token...");
    const { api } = await import('../services/api');
    const users = await api.get('/users') as unknown[];
    console.log("✅ API call successful, found", users.length, "users");
    
    console.log("Step 4: Testing auth state...");
    const { useAuthStore } = await import('../store/useAuthStore');
    const authState = useAuthStore.getState();
    console.log("Auth state:", {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasAccessToken: !!authState.accessToken
    });
    
    console.log("✅ LOGIN FLOW TEST COMPLETE - SUCCESS");
    return true;
    
  } catch (error) {
    console.log("❌ LOGIN FLOW TEST FAILED:", error);
    return false;
  }
};

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugAuth = debugAuthState;
  (window as unknown as Record<string, unknown>).clearAuth = clearAllAuthData;
  (window as unknown as Record<string, unknown>).testAuth = testAuthFlow;
  (window as unknown as Record<string, unknown>).testOAuth2 = testOAuth2Token;
  (window as unknown as Record<string, unknown>).testApi = testApiCall;
  (window as unknown as Record<string, unknown>).testLogin = testLoginFlow;
}
