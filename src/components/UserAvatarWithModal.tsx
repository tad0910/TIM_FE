import { useNavigate } from "react-router-dom";
import UserAvatar from "./UserAvatar";

interface UserAvatarWithModalProps {
  authorName?: string;
  className?: string;
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  userId?: string;
  clickable?: boolean;
}

export default function UserAvatarWithModal({
  authorName,
  className,
  src,
  name,
  size,
  userId,
  clickable = true
}: UserAvatarWithModalProps) {
  const navigate = useNavigate();

  const handleAvatarClick = (clickedUserId: string) => {
    navigate(`/profile/${clickedUserId}`);
  };

  return (
    <UserAvatar
      authorName={authorName}
      className={className}
      src={src}
      name={name}
      size={size}
      userId={userId}
      onClick={handleAvatarClick}
      clickable={clickable}
    />
  );
}
