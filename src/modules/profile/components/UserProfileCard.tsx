import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../../../types/profile";
import AvatarUpload from "./AvatarUpload";
import { uploadCover, getUserById } from "../../../services/profileApi";
import EditProfileModal from "./EditProfileModal";
import PersonalImagesModal from "./PersonalImagesModal";
import MediaStorageModal from "./MediaStorageModal";
import { useAuthStore } from "../../../store/useAuthStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  getMyGamificationStats,
  getUserGamificationStats,
  type UserGamificationStats,
} from "../../../services/gamificationApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { useNotification } from "../../../hooks/useNotification";
import NotificationPopup from "../../../components/NotificationPopup";

const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return "/default-avatar.png";

  if (imageUrl.startsWith("http")) return imageUrl;

  if (imageUrl.startsWith("/uploads")) {
    const BASE_URL = (import.meta.env.VITE_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:8081") as string;
    return `${BASE_URL}${imageUrl}`;
  }

  return imageUrl;
};

interface UserProfileCardProps {
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function UserProfileCard({
  profile,
  onProfileUpdate,
}: UserProfileCardProps) {
  const queryClient = useQueryClient();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [showMediaStorageModal, setShowMediaStorageModal] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isOwnProfile = useMemo(
    () => String(user?.id) === String(profile.userId),
    [user?.id, profile.userId]
  );
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const computeDisplayName = async () => {
      if (isOwnProfile && profile.userId) {
        try {
          const userInfo = await getUserById(String(profile.userId));
          const fullFromUser =
            [userInfo.firstName, userInfo.lastName]
              .filter(Boolean)
              .join(" ") || userInfo.username || "";
          if (fullFromUser.trim()) {
            setDisplayName(fullFromUser.trim());
            return;
          }
        } catch (error) {
          console.warn(
            "[UserProfileCard-outer] Failed to load user info for displayName:",
            error
          );
        }
      }

      const fullFromProfile =
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        profile.username ||
        profile.name ||
        "Người dùng";
      setDisplayName(fullFromProfile);
    };

    void computeDisplayName();
  }, [isOwnProfile, profile.userId, profile.firstName, profile.lastName, profile.username, profile.name]);

  const {
    data: gamificationStats,
    isLoading: isLoadingStats,
  } = useQuery<UserGamificationStats>({
    queryKey: isOwnProfile
      ? queryKeys.gamification.myStats()
      : queryKeys.gamification.userStats(Number(profile.userId || 0)),
    queryFn: async () => {
      if (!profile.userId) throw new Error('No userId available');
      return isOwnProfile
        ? getMyGamificationStats()
        : getUserGamificationStats(Number(profile.userId));
    },
    enabled: Boolean(profile.userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const formatPoints = (value?: number) => {
    if (typeof value === "number") {
      return value.toLocaleString("vi-VN");
    }
    return "—";
  };

  return (
    <>
      <div className="space-y-4 sticky top-24">
        <div className="bg-white rounded-2xl shadow-lg p-0">
          <div className="w-full h-32 bg-gradient-to-r rounded-t-2xl" />

          <div className="px-6">
            <div className="relative -mt-20 md:-mt-24 lg:-mt-28 inline-block">
              <img
                src={getImageUrl(
                  (profile.profileImage ||
                    profile.avatar ||
                    "/default-avatar.png") as string
                )}
                alt={profile.username || profile.name || "User"}
                className={`w-32 h-32 rounded-full object-cover mx-16 border-4 border-white shadow-md ${
                  isOwnProfile
                    ? "cursor-pointer hover:opacity-80 transition-opacity"
                    : ""
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/default-avatar.png";
                }}
                onClick={() => {
                  if (!isOwnProfile) return;
                  const trigger = document.querySelector(
                    '[data-trigger="avatar-upload"]'
                  ) as HTMLElement | null;
                  trigger?.click();
                }}
              />
              {isOwnProfile && (
                <AvatarUpload
                  userId={profile.userId?.toString() || "0"}
                  onAvatarUpdate={(newAvatar) =>
                    onProfileUpdate({
                      ...profile,
                      avatar: newAvatar,
                      profileImage: newAvatar,
                    })
                  }
                />
              )}
            </div>
          </div>

          <div className="mt-2 mb-4 px-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {displayName}
              </h2>
            </div>

            <div className="space-y-2 mb-4">
              {profile.phoneNumber ? (
                <div className="flex items-center gap-2 text-gray-700">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-sm">{profile.phoneNumber}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-sm">Chưa cập nhật</span>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <svg
                    className="w-5 h-5 text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm">{profile.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-6 px-6">
            {isOwnProfile ? (
              <>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e: Event) => {
                      const target = e.target as HTMLInputElement;
                      const file = target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadCover(
                          (profile.userId || 0).toString(),
                          file
                        );
                        if (res?.imageUrl) {
                          onProfileUpdate({
                            ...profile,
                            coverImage: res.imageUrl,
                          });
                          // Invalidate profile queries to trigger refetch
                          queryClient.invalidateQueries({
                            queryKey: queryKeys.profile.detail(profile.userId?.toString() || '')
                          });
                          queryClient.invalidateQueries({
                            queryKey: queryKeys.profile.coverImage(profile.userId?.toString() || '')
                          });
                          queryClient.invalidateQueries({
                            queryKey: ['user', 'byId', profile.userId?.toString() || '']
                          });
                          showSuccess('Thành công', 'Đã cập nhật ảnh bìa');
                        }
                      } catch (err) {
                        console.error("Upload cover failed", err);
                        showError('Lỗi', 'Không thể tải ảnh bìa.');
                      }
                    };
                    input.click();
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Tải bìa</span>
                </button>

                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  onClick={() => {
                    setShowMediaStorageModal(true);
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Ảnh cá nhân</span>
                </button>

                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                  title="Tính năng sắp ra mắt"
                  disabled
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9l-6 6-3-3"
                    />
                  </svg>
                  <span>Theo dõi (Soon)</span>
                </button>

                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                  title="Tính năng sắp ra mắt"
                  disabled
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <span>Kết bạn (Soon)</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm pb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">{profile.status || "Đang học"}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Điểm thưởng</p>
            {isLoadingStats && (
            <span className="text-xs text-gray-500">Đang tải...</span>
          )}
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/competency")}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "clock"]}
                className="text-blue-600 w-4 h-4"
              />
              <p className="text-sm text-gray-600">Điểm chuyên cần</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalDiligence)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/competency")}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "brain"]}
                className="text-blue-600 w-4 h-4"
              />

              <p className="text-sm text-gray-600">Điểm năng lực</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalCompetence)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/competency")}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={["fas", "book-open"]}
                className="text-blue-600 w-4 h-4"
              />

              <p className="text-sm text-gray-600">Điểm kinh nghiệm</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatPoints(gamificationStats?.totalExperience)}
            </span>
          </button>
        </div>
        {!isLoadingStats && !gamificationStats && (
          <p className="text-xs text-gray-500 mt-3">
            Chưa có dữ liệu điểm thưởng.
          </p>
        )}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedProfile) => {
            onProfileUpdate(updatedProfile);

            const fullFromUpdatedProfile =
              [updatedProfile.firstName, updatedProfile.lastName]
                .filter(Boolean)
                .join(" ") ||
              updatedProfile.username ||
              updatedProfile.name ||
              "Người dùng";
            setDisplayName(fullFromUpdatedProfile);

            setShowEditModal(false);
          }}
        />
      )}
      {showImagesModal && (
        <PersonalImagesModal
          userId={profile.userId?.toString() || "0"}
          onClose={() => setShowImagesModal(false)}
        />
      )}
      {showMediaStorageModal && (
        <MediaStorageModal
          userId={profile.userId?.toString() || "0"}
          isOpen={showMediaStorageModal}
          onClose={() => setShowMediaStorageModal(false)}
        />
      )}
      <NotificationPopup notification={notification} onClose={hideNotification} />
    </>
  );
}
