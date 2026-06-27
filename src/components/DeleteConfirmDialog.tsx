import { useState } from "react";
import { deletePost } from "../services/postApi";
import type { Post } from "../types/post";

interface DeleteConfirmDialogProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export default function DeleteConfirmDialog({ post, isOpen, onClose, onSuccess, onError }: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deletePost(post.id);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error deleting post:", err);
      const errorMessage = (err as Error)?.message || "Không thể xóa bài viết";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Xóa bài viết</h2>
            <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            Bạn có chắc chắn muốn xóa bài viết này không? Bài viết sẽ bị xóa vĩnh viễn và không thể khôi phục.
          </p>
          
          {post.content && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 line-clamp-3">
                "{post.content}"
              </p>
            </div>
          )}
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
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Đang xóa..." : "Xóa bài viết"}
          </button>
        </div>
      </div>
    </div>
  );
}
