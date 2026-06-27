import { useEffect, useState } from "react";
import { getProfileImage } from "./profileApi";
import { useAuthStore } from "../store/useAuthStore";
import defaultAvatar from "../assets/default-avatar.png";

export function getImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') {
    return defaultAvatar;
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  if (imageUrl.startsWith("/uploads")) {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    return `${BASE_URL}${imageUrl}`;
  }
  return imageUrl;
}

export function useCurrentAvatar() {
  const { user } = useAuthStore();
  const [avatar, setAvatar] = useState<string>(defaultAvatar);

  useEffect(() => {
    const load = async () => {
      const userId = user?.id;
      if (!userId) {
        setAvatar(defaultAvatar);
        return;
      }
      
      try {
        const res = await getProfileImage(userId);
        if (res?.profileImage && res.profileImage.trim() !== '') {
          localStorage.setItem(`avatar_url_${userId}`, res.profileImage);
          setAvatar(getImageUrl(res.profileImage));
        } else {
          localStorage.removeItem(`avatar_url_${userId}`);
          setAvatar(defaultAvatar);
        }
      } catch (error) {
        console.log('Error loading profile image:', error);
        localStorage.removeItem(`avatar_url_${userId}`);
        setAvatar(defaultAvatar);
      }
    };
    load();
  }, [user?.id]);

  return avatar;
}


