import { useState } from "react";
import { updatePostPrivacy } from "../services/postApi";
import type { Post } from "../types/post";

interface PrivacySettingsProps {
  post: Post;
  isOpen: boolean;
  onSuccess: (updatedPost: Post) => void;
  onClose: () => void;
}

export default function PrivacySettings({ post, isOpen, onSuccess, onClose }: PrivacySettingsProps) {
  const [privacy, setPrivacy] = useState<"open" | "friends" | "only_me">(post.privacy as "open" | "friends" | "only_me");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (privacy === post.privacy) {
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const updatedPost = await updatePostPrivacy(post.id, privacy);
      onSuccess(updatedPost);
      onClose();
    } catch (err) {
      console.error("Error updating post privacy:", err);
      setError((err as Error)?.message || "Không thể cập nhật quyền riêng tư");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const privacyOptions = [
    {
      value: "open" as const,
      label: "Công khai",
      description: "Mọi người đều có thể xem bài viết này",
      icon: "🌍"
    },
    {
      value: "friends" as const,
      label: "Bạn bè",
      description: "Chỉ bạn bè có thể xem bài viết này",
      icon: "👥"
    },
    {
      value: "only_me" as const,
      label: "Chỉ mình tôi",
      description: "Chỉ bạn có thể xem bài viết này",
      icon: "🔒"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Quyền riêng tư</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Chọn ai có thể xem bài viết này
            </p>
            
            <div className="space-y-3">
              {privacyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    privacy === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={option.value}
                    checked={privacy === option.value}
                    onChange={(e) => setPrivacy(e.target.value as "open" | "friends" | "only_me")}
                    className="mt-1 mr-3"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
