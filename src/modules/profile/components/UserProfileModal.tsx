import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import type { UserProfile } from "../../../types/profile";
import { getUserProfileById } from "../../../services/profileApi";
import UserProfileCard from "./UserProfileCard";
import PostsSection from "./PostsSection";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
    }
  }, [isOpen, userId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profileData = await getUserProfileById(userId);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-3 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={["fas", "user"]} /> Thông tin người dùng
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 text-xl leading-none"
              aria-label="Đóng"
            >
              <FontAwesomeIcon icon={["fas", "xmark"]} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={loadProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : profile ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - User Profile Card */}
                <div className="lg:col-span-1">
                  <UserProfileCard 
                    profile={profile} 
                    onProfileUpdate={setProfile}
                  />
                </div>

                {/* Main Content - Posts */}
                <div className="lg:col-span-2">
                  <PostsSection 
                    userId={profile.userId?.toString() || userId} 
                    refreshTrigger={0}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
