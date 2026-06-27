import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadAvatar } from "../../../services/profileApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import { useNotification } from "../../../hooks/useNotification";

interface AvatarUploadProps {
  userId: string;
  onAvatarUpdate: (newAvatar: string) => void;
}

export default function AvatarUpload({ userId, onAvatarUpdate }: AvatarUploadProps) {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useNotification();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showWarning('File không hợp lệ', 'Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showWarning('File quá lớn', 'Kích thước ảnh không được vượt quá 2MB');
      return;
    }

    setIsUploading(true);
    try {
      console.log('Uploading avatar for user:', userId);
      const response = await uploadAvatar(userId, file);
      console.log('Upload response:', response);
      
      const imageUrl = response.imageUrl || response.user?.profileImage;
      if (imageUrl) {
        console.log('Avatar updated with URL:', imageUrl);
        onAvatarUpdate(imageUrl);
        // Invalidate profile queries to trigger refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.detail(userId)
        });
        queryClient.invalidateQueries({
          queryKey: ['user', 'byId', userId]
        });
        showSuccess('Thành công', 'Đã cập nhật ảnh đại diện');
      } else {
        console.error('No imageUrl in response:', response);
        showError('Lỗi', 'Không thể lấy URL ảnh từ server');
      }
    } catch (error) {
      console.error('Upload avatar failed:', error);
      showError('Lỗi', 'Có lỗi xảy ra khi upload ảnh. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [userId, onAvatarUpdate, queryClient, showSuccess, showError, showWarning]);

  const triggerOpen = () => fileInputRef.current?.click();

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <span data-trigger="avatar-upload" onClick={triggerOpen} hidden={!isUploading}></span>
    </div>
  );
}
