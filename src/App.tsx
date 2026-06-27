import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { NotificationProvider } from "./contexts/NotificationContext";
import { UserProvider } from "./contexts/UserContext";
import UserService from "./modules/auth/services/keycloakService";

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isLogoutRedirect = urlParams.get('logout') === 'true';
    
    const authMode = localStorage.getItem("auth_mode");
    const localToken = localStorage.getItem("auth_token");
    
    if (authMode === "local" && localToken && !isLogoutRedirect) {
      console.log("Local authentication detected");
      if (window.location.pathname === "/login") {
        window.location.href = "/";
      }
    } else if (isLogoutRedirect) {
      console.log("Logout redirect detected, staying on login page");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    UserService.initKeycloak(() => {
      setIsReady(true);
    }, () => { });
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </UserProvider>
    </BrowserRouter>
  );
}
