import { useAuthStore } from '../store/useAuthStore';

export default function AuthDebug() {
  const { user, isAuthenticated, accessToken, refreshToken } = useAuthStore();
  
  const authToken = localStorage.getItem('auth_token');
  const refreshTokenLocal = localStorage.getItem('refresh_token');
  const userId = localStorage.getItem('userId');
  const authMode = localStorage.getItem('auth_mode');

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔍 Auth Debug</h4>
      <div><strong>Store State:</strong></div>
      <div>• isAuthenticated: {isAuthenticated ? '✅' : '❌'}</div>
      <div>• user: {user ? `${user.username} (${user.id})` : 'null'}</div>
      <div>• accessToken: {accessToken ? `✅ (${accessToken.length} chars)` : '❌'}</div>
      <div>• refreshToken: {refreshToken ? `✅ (${refreshToken.length} chars)` : '❌'}</div>
      
      <div style={{ marginTop: '10px' }}><strong>LocalStorage:</strong></div>
      <div>• auth_token: {authToken ? `✅ (${authToken.length} chars)` : '❌'}</div>
      <div>• refresh_token: {refreshTokenLocal ? `✅ (${refreshTokenLocal.length} chars)` : '❌'}</div>
      <div>• userId: {userId || '❌'}</div>
      <div>• auth_mode: {authMode || '❌'}</div>
      
      <div style={{ marginTop: '10px' }}><strong>Sync Status:</strong></div>
      <div>• Store vs LocalStorage: {
        (isAuthenticated && authToken && user) ? '✅ Synced' : '❌ Out of sync'
      }</div>
    </div>
  );
}

