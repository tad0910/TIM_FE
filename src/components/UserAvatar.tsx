import { useState, useEffect } from "react";
import { resolveMediaUrl } from "../utils/mediaUrl";

interface UserAvatarProps {
  authorName?: string;
  className?: string;
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  userId?: string;
  onClick?: (userId: string) => void;
  clickable?: boolean;
}

export default function UserAvatar({ 
  authorName, 
  className, 
  src, 
  name, 
  size = 'md',
  userId,
  onClick,
  clickable = false
}: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>('/default-avatar.png');

  const getSizeClasses = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-12 h-12';
      case 'xl': return 'w-16 h-16';
      default: return 'w-10 h-10';
    }
  };

  useEffect(() => {
    if (src && src.trim() !== '' && src !== 'null' && src !== 'undefined') {
      if (src.startsWith('/uploads')) {
        setAvatarUrl(resolveMediaUrl(src));
      } else if (src.startsWith('http')) {
        setAvatarUrl(src);
      } else {
        setAvatarUrl(src);
      }
      return;
    }

    setAvatarUrl('/default-avatar.png');
  }, [src]);

  const handleClick = () => {
    if (clickable && userId && onClick) {
      onClick(userId);
    }
  };

  return (
    <img
      src={avatarUrl}
      alt={name || authorName || "User"}
      className={`${getSizeClasses()} ${className || ''} object-cover rounded-full ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={handleClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/default-avatar.png';
      }}
    />
  );
}
