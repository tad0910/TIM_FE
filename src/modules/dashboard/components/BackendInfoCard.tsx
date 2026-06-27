import { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { getUserProfile } from "../../../services/profileApi";
import type { UserProfile } from "../../../types/profile";

export default function BackendInfoCard() {
  const { user, isAuthenticated } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!isAuthenticated || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const profile = await getUserProfile(user.id);
        setUserProfile(profile);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Không thể tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [user?.id, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Vui lòng đăng nhập để xem thông tin</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin từ Backend</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin từ Backend</h3>
          <span className="text-red-500 text-sm">Error</span>
        </div>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Thông tin từ Backend</h3>
        <span className="text-green-500 text-sm">🟢 Online</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">User ID</span>
          <span className="text-sm font-medium text-gray-900">{userProfile?.userId}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Username</span>
          <span className="text-sm font-medium text-gray-900">{userProfile?.username}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Email</span>
          <span className="text-sm font-medium text-gray-900 truncate max-w-32" title={userProfile?.email}>
            {userProfile?.email}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Role</span>
          <span className="text-sm font-medium text-blue-600 capitalize">
            {userProfile?.role || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Phone</span>
          <span className="text-sm font-medium text-gray-900">
            {userProfile?.phoneNumber || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Created</span>
          <span className="text-sm font-medium text-gray-900">
            {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
          </span>
        </div>

        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Profile Stats</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{userProfile?.posts?.length || 0}</div>
              <div className="text-xs text-blue-500">Posts</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{userProfile?.images?.length || 0}</div>
              <div className="text-xs text-green-500">Images</div>
            </div>
          </div>
        </div>

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
