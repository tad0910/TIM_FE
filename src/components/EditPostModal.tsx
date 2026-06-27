import { useState, useEffect, useRef } from "react";
import { updatePostWithFiles } from "../services/postApi";
import type { Post } from "../types/post";
import { validateFiles, isDocumentFile, getFileIcon, formatFileSize } from "../utils/fileValidation";
import { compressImage } from "../utils/imageCompression";

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPost: Post) => void;
}

export default function EditPostModal({ post, isOpen, onClose, onSuccess }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const [privacy, setPrivacy] = useState<"open" | "friends" | "only_me">(post.privacy as "open" | "friends" | "only_me");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{id: number, url: string}[]>([]);
  const [existingVideos, setExistingVideos] = useState<{id: number, url: string}[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<{id: number, url: string, name: string, type: string}[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(post.content);
      setPrivacy(post.privacy as "open" | "friends" | "only_me");
      setError(null);
      
      const fileInfos = (window as { __postFileInfos?: Record<string, Array<{ id: number; url: string; type: string }>> }).__postFileInfos?.[post.id] || [];
      console.log('Loading file infos for post:', post.id, fileInfos);
      
      const imageInfos = fileInfos.filter((f: { id: number; url: string; type: string }) => f.type === 'IMAGE');
      const videoInfos = fileInfos.filter((f: { id: number; url: string; type: string }) => f.type === 'VIDEO');
      const docInfos = fileInfos.filter((f: { id: number; url: string; type: string }) => f.type === 'DOCUMENT');
      
      setExistingImages(imageInfos.map((info: { id: number; url: string; type: string }) => ({ id: info.id, url: info.url })));
      setExistingVideos(videoInfos.map((info: { id: number; url: string; type: string }) => ({ id: info.id, url: info.url })));
      setExistingDocuments(docInfos.map((info: { id: number; url: string; type: string }) => ({ 
        id: info.id, 
        url: info.url, 
        name: info.url.split('/').pop() || 'document', 
        type: 'application/pdf' 
      })));
      
      setFiles([]);
      setImagePreviews([]);
      setVideoPreviews([]);
      setDocumentFiles([]);
      setRemovedFileIds([]);
    }
  }, [isOpen, post]);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      const fileArray = Array.from(selectedFiles);
      const validationResult = validateFiles(fileArray);
      
      if (!validationResult.isValid) {
        setError(validationResult.errors[0] || 'File không hợp lệ');
        return;
      }

      const newFiles = [...files, ...fileArray];
      setFiles(newFiles);

      const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
      for (const file of imageFiles) {
        try {
          const compressedFile = await compressImage(file);
          const previewUrl = URL.createObjectURL(compressedFile);
          setImagePreviews(prev => [...prev, previewUrl]);
        } catch (err) {
          console.error('Error compressing image:', err);
          setError('Lỗi xử lý ảnh. Vui lòng thử lại.');
        }
      }

      const videoFiles = fileArray.filter(file => file.type.startsWith('video/'));
      for (const file of videoFiles) {
        const previewUrl = URL.createObjectURL(file);
        setVideoPreviews(prev => [...prev, previewUrl]);
      }

      const docFiles = fileArray.filter(file => isDocumentFile(file));
      setDocumentFiles(prev => [...prev, ...docFiles]);

    } catch (err) {
      console.error('Error processing files:', err);
      setError('Có lỗi xảy ra khi xử lý file. Vui lòng thử lại.');
    }
  };

  const removeExistingFile = (fileId: number, fileUrl: string, type: 'image' | 'video' | 'document') => {
    console.log('Removing file with ID:', fileId, 'URL:', fileUrl, 'Type:', type);
    if (type === 'image') {
      setExistingImages(prev => prev.filter(img => img.url !== fileUrl));
    } else if (type === 'video') {
      setExistingVideos(prev => prev.filter(vid => vid.url !== fileUrl));
    } else if (type === 'document') {
      setExistingDocuments(prev => prev.filter(doc => doc.url !== fileUrl));
    }
    setRemovedFileIds(prev => [...prev, fileId]);
  };

  const removeNewFile = (index: number, type: 'image' | 'video' | 'document') => {
    if (type === 'image') {
      setImagePreviews(prev => {
        const newPreviews = [...prev];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        return newPreviews;
      });
    } else if (type === 'video') {
      setVideoPreviews(prev => {
        const newPreviews = [...prev];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        return newPreviews;
      });
    } else if (type === 'document') {
      setDocumentFiles(prev => prev.filter((_, i) => i !== index));
    }
    
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const updatedPost = await updatePostWithFiles(
        post.id, 
        content.trim(), 
        privacy, 
        files, 
        removedFileIds
      );
      onSuccess(updatedPost);
      onClose();
    } catch (err) {
      console.error("Error updating post:", err);
      setError((err as Error)?.message || "Không thể cập nhật bài viết");
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Chỉnh sửa bài viết</h2>
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì?"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              disabled={isLoading}
              required
            />
          </div>

          {(existingImages.length > 0 || existingVideos.length > 0 || existingDocuments.length > 0) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files hiện tại
              </label>
              <div className="space-y-2">
                {existingImages.map((image, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img src={image.url} alt={`Existing ${index}`} className="w-8 h-8 object-cover rounded" />
                      <span className="text-sm text-gray-600">Ảnh {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(image.id, image.url, 'image')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                
                {existingVideos.map((video, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <video src={video.url} className="w-8 h-8 object-cover rounded" />
                      <span className="text-sm text-gray-600">Video {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(video.id, video.url, 'video')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                
                {existingDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getFileIcon({ type: doc.type } as File)}</span>
                      <span className="text-sm text-gray-600">{doc.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(doc.id, doc.url, 'document')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(imagePreviews.length > 0 || videoPreviews.length > 0 || documentFiles.length > 0) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files mới
              </label>
              <div className="space-y-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img src={preview} alt={`New ${index}`} className="w-8 h-8 object-cover rounded" />
                      <span className="text-sm text-gray-600">Ảnh mới {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index, 'image')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                
                {videoPreviews.map((preview, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <video src={preview} className="w-8 h-8 object-cover rounded" />
                      <span className="text-sm text-gray-600">Video mới {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index, 'video')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                
                {documentFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getFileIcon(file)}</span>
                      <span className="text-sm text-gray-600">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index, 'document')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thêm files
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm text-gray-600">Click để thêm files</p>
              </div>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quyền riêng tư
            </label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as "open" | "friends" | "only_me")}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="open">Công khai</option>
              <option value="friends">Bạn bè</option>
              <option value="only_me">Chỉ mình tôi</option>
            </select>
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
              disabled={isLoading || !content.trim()}
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
