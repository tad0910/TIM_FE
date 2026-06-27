import { Navigate, useLocation } from "react-router-dom";
import { useIsAdmin } from "../../../utils/useIsAdmin";
import type { JSX } from "react";
import UserService from "../services/keycloakService";


export function AdminRouter({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) return null;

  if (!UserService.isLoggedIn()) {
    console.warn("AdminRouter - User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    if (import.meta.env.DEV) {
      console.warn("AdminRouter - User is not admin, but allowing access in DEV mode");
    } else {
      console.warn("AdminRouter - User is not admin, redirecting to home");
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  }

  return children;
}

