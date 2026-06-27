import { Navigate, useLocation } from "react-router-dom";
import UserService from "../services/keycloakService";
import type { JSX } from "react";
import { useAuthStore } from "../../../store/useAuthStore";


export function AuthenticationRouter({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const auth = UserService.isLoggedIn();

  console.log("AuthenticationRouter - auth status:", auth);
  console.log("AuthenticationRouter - keycloak.authenticated:", UserService.getKeyCloack().authenticated);
  console.log("AuthenticationRouter - auth_mode:", localStorage.getItem("auth_mode"));
  console.log("AuthenticationRouter - auth_token:", localStorage.getItem("auth_token") ? "exists" : "missing");

  if (auth) {
    return children;
  } else {
    console.warn("AuthenticationRouter - User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} />;
  }
}

export function PublicRouter({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const auth = UserService.isLoggedIn();
  const { user } = useAuthStore();

  console.log("PublicRouter - auth status:", auth);
  console.log("PublicRouter - keycloak.authenticated:", UserService.getKeyCloack().authenticated);
  console.log("PublicRouter - auth_mode:", localStorage.getItem("auth_mode"));

  if (!auth) {
    return children;
  } else {
    if (user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_GIAO_VIEN') {
      return <Navigate to="/admin/dashboard" state={{ from: location }} />;
    }
    return <Navigate to="/" state={{ from: location }} />;
  }
}