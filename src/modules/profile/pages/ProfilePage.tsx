import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/useAuthStore";
import type { UserProfile } from "../../../types/profile";
import { getUserProfile, getCoverImage } from "../../../services/profileApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import UserProfileCard from "../components/UserProfileCard";
import ProfileCover from "../components/ProfileCover";
import PostsSection from "../components/PostsSection";
import ProgressBadgesSection from "../components/ProgressBadgesSection";
import PostBox from "../../dashboard/components/PostBox";
import ProfileCardSkeleton from "../../../components/ProfileCardSkeleton";
import PostsListSkeleton from "../../../components/PostsListSkeleton";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [refreshPosts, setRefreshPosts] = useState(0);

  const userId = useMemo(() => id || user?.id, [id, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // React Query: Fetch user profile
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: queryKeys.profile.detail(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('No userId available');
      try {
        return await getUserProfile(userId);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('HTTP 401')) {
          console.warn('ProfilePage - 401 error detected, redirecting to login');
          navigate('/login', { replace: true });
        }
        throw error;
      }
    },
    enabled: Boolean(isAuthenticated && user && userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch cover image as fallback
  const {
    data: coverImageData,
  } = useQuery({
    queryKey: queryKeys.profile.coverImage(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('No userId available');
      return getCoverImage(userId);
    },
    enabled: Boolean(isAuthenticated && user && userId && !profileData?.coverImage),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Merge profile data with cover image if needed
  const profile = useMemo(() => {
    if (!profileData) return null;
    if (profileData.coverImage) return profileData;
    if (coverImageData?.coverImage) {
      return { ...profileData, coverImage: coverImageData.coverImage };
    }
    return profileData;
  }, [profileData, coverImageData]);

  const isLoading = profileLoading;
  const error = profileError ? (profileError as Error)?.message || 'Lỗi tải hồ sơ' : null;

  if (!isAuthenticated || !user) {
    return null;
  }

  if (isLoading) {
    const isOwnProfile = user?.id === id?.toString() || !id;
    
    return (
      <div className="w-full">
        <div className="w-full space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className="lg:col-span-3"></div>
            <div className="lg:col-span-9 -mb-[14.5rem] lg:-mb-[62]">
              <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
            <div className="lg:col-span-3 relative z-10 -mt-8 lg:-mt-12">
              <ProfileCardSkeleton />
            </div>

            <div className="lg:col-span-6 space-y-6" style={{ marginTop: '220px' }}>
              <PostsListSkeleton />
            </div>

            <div className="lg:col-span-3 space-y-6" style={{ marginTop: '220px' }}>
              <div className="space-y-6">
                {isOwnProfile && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-20 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                )}
                <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-16 mb-4"></div>
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải hồ sơ</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F4F7' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy hồ sơ</h1>
          <p className="text-gray-600">Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-3"></div>
          <div className="lg:col-span-9 -mb-[14.5rem] lg:-mb-[62]">
            <ProfileCover cover={profile?.coverImage} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          <div className="lg:col-span-3 relative z-10 -mt-8 lg:-mt-12">
            <UserProfileCard 
              profile={profile} 
              onProfileUpdate={() => {
                // Profile update will be handled by React Query invalidation if needed
              }}
            />
          </div>

          <div className="lg:col-span-6 space-y-6">
            {user?.id === profile?.userId?.toString() ? (
              <PostBox 
                onPostCreated={() => {
                  setRefreshPosts(prev => prev + 1);
                }}
                marginTop="220px"
              />
            ) : (
              <div style={{ marginTop: '220px' }}></div>
            )}
            
            <PostsSection 
              userId={profile?.userId?.toString() || user?.id || ""} 
              refreshTrigger={refreshPosts}
            />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <ProgressBadgesSection 
              userId={profile?.userId?.toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}