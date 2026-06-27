import { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/useAuthStore";

interface TokenInfo {
  token: string | null;
  isExpired: boolean;
  expiresAt: string | null;
  payload: any;
}

export default function AuthInfoCard() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      setLoading(true);
      
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const exp = payload.exp ? new Date(payload.exp * 1000) : null;
          const isExpired = exp ? exp < new Date() : false;
          
          setTokenInfo({
            token: token.substring(0, 20) + '...',
            isExpired,
            expiresAt: exp ? exp.toLocaleString('vi-VN') : null,
            payload
          });
        }
      } catch (error) {
        console.error("Error parsing token:", error);
        setTokenInfo({
          token: token.substring(0, 20) + '...',
          isExpired: false,
          expiresAt: null,
          payload: null
        });
      } finally {
        setLoading(false);
      }
    }
  }, [token, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Chưa đăng nhập</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Auth Info</h3>
        <span className={`text-sm ${tokenInfo?.isExpired ? 'text-red-500' : 'text-green-500'}`}>
          {tokenInfo?.isExpired ? '🔴 Expired' : '🟢 Valid'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">User ID</span>
          <span className="text-sm font-medium text-gray-900">{user?.id}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Username</span>
          <span className="text-sm font-medium text-gray-900">{user?.username}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Email</span>
          <span className="text-sm font-medium text-gray-900 truncate max-w-32" title={user?.email}>
            {user?.email}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Auth Mode</span>
          <span className="text-sm font-medium text-blue-600">
            {localStorage.getItem('auth_mode') || 'Unknown'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Token</span>
          <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {tokenInfo?.token || 'N/A'}
          </span>
        </div>

        {tokenInfo?.expiresAt && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Expires</span>
            <span className="text-sm font-medium text-gray-900">
              {tokenInfo.expiresAt}
            </span>
          </div>
        )}

        {tokenInfo?.payload && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Token Payload</h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <pre className="text-xs text-gray-600">
                {JSON.stringify(tokenInfo.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Last updated</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
