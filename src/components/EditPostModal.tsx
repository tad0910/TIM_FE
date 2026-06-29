import { useState, useEffect, useRef } from "react";
import { updatePostWithFiles } from "../services/postApi";
import type { Post } from "../types/post";
import { validateFiles, isDocumentFile, getFileIcon, formatFileSize } from "../utils/fileValidation";
import { compressImage } from "../utils/imageCompression";
import { useAuthStore } from "../store/useAuthStore";
import UserAvatar from "./UserAvatar";
import ModernPhotoGrid from "./ModernPhotoGrid";
import NotificationPopup from "./NotificationPopup";
import { useNotification } from "../hooks/useNotification";

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPost: Post) => void;
}

export default function EditPostModal({ post, isOpen, onClose, onSuccess }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const [privacy, setPrivacy] = useState<"open" | "friends" | "only_me">(post.privacy as "open" | "friends" | "only_me");
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{id: number, url: string}[]>([]);
  const [existingVideos, setExistingVideos] = useState<{id: number, url: string}[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<{id: number, url: string, name: string, type: string}[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privacyDropdownRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const { notification, hideNotification, showWarning, showApiError } = useNotification();

  const getDisplayName = () => {
    return user?.username || 'Người dùng';
  };

  useEffect(() => {
    if (isOpen) {
      setContent(post.content);
      setPrivacy(post.privacy as "open" | "friends" | "only_me");
      setShowPrivacyDropdown(false);

      const fileInfos = (window as { __postFileInfos?: Record<string, Array<{ id: number; url: string; type: string }>> }).__postFileInfos?.[post.id] || [];

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (privacyDropdownRef.current && !privacyDropdownRef.current.contains(event.target as Node)) {
        setShowPrivacyDropdown(false);
      }
    };

    if (showPrivacyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPrivacyDropdown]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    try {
      const totalFiles = files.length + selectedFiles.length;
      if (totalFiles > 10) {
        showWarning('Quá nhiều file', `Bạn chỉ có thể đính kèm tối đa 10 file. Hiện tại bạn đã có ${files.length} file.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const validationResult = validateFiles(selectedFiles, {
        allowedTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/quicktime',
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
        ],
        maxSize: 50 * 1024 * 1024,
        maxFiles: 10
      });

      if (!validationResult.isValid) {
        showWarning('File không hợp lệ', validationResult.errors[0] || 'Vui lòng chọn file hợp lệ');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const updatedFiles = [...files, ...selectedFiles];
      const newImagePreviews: string[] = [];
      const newVideoPreviews: string[] = [];
      const newDocumentFiles: File[] = [];

      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          const preview = URL.createObjectURL(file);
          newImagePreviews.push(preview);
        } else if (file.type.startsWith('video/')) {
          const preview = URL.createObjectURL(file);
          newVideoPreviews.push(preview);
        } else if (isDocumentFile(file)) {
          newDocumentFiles.push(file);
        }
      }

      setFiles(updatedFiles);
      setImagePreviews([...imagePreviews, ...newImagePreviews]);
      setVideoPreviews([...videoPreviews, ...newVideoPreviews]);
      setDocumentFiles([...documentFiles, ...newDocumentFiles]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error processing files:', error);
      showApiError(error, 'Có lỗi xảy ra khi xử lý file.', 'Lỗi xử lý file');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeExistingFile = (fileId: number, fileUrl: string, type: 'image' | 'video' | 'document') => {
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
      URL.revokeObjectURL(imagePreviews[index]);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setImagePreviews(newPreviews);
      const imageFileIndices = files.reduce<number[]>((acc, f, i) => {
        if (f.type.startsWith('image/')) acc.push(i);
        return acc;
      }, []);
      if (imageFileIndices[index] !== undefined) {
        setFiles(prev => prev.filter((_, i) => i !== imageFileIndices[index]));
      }
    } else if (type === 'video') {
      URL.revokeObjectURL(videoPreviews[index]);
      const newPreviews = videoPreviews.filter((_, i) => i !== index);
      setVideoPreviews(newPreviews);
      const videoFileIndices = files.reduce<number[]>((acc, f, i) => {
        if (f.type.startsWith('video/')) acc.push(i);
        return acc;
      }, []);
      if (videoFileIndices[index] !== undefined) {
        setFiles(prev => prev.filter((_, i) => i !== videoFileIndices[index]));
      }
    } else if (type === 'document') {
      const newDocs = documentFiles.filter((_, i) => i !== index);
      setDocumentFiles(newDocs);
      const docFileIndices = files.reduce<number[]>((acc, f, i) => {
        if (isDocumentFile(f)) acc.push(i);
        return acc;
      }, []);
      if (docFileIndices[index] !== undefined) {
        setFiles(prev => prev.filter((_, i) => i !== docFileIndices[index]));
      }
    }
  };

  const clearAllNewFiles = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    videoPreviews.forEach(url => URL.revokeObjectURL(url));

    setFiles([]);
    setImagePreviews([]);
    setVideoPreviews([]);
    setDocumentFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showWarning('Thiếu nội dung', 'Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      setIsLoading(true);

      const compressedFiles: File[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          compressedFiles.push(compressed);
        } else {
          compressedFiles.push(file);
        }
      }

      const updatedPost = await updatePostWithFiles(
        post.id,
        content.trim(),
        privacy,
        compressedFiles,
        removedFileIds
      );
      onSuccess(updatedPost);
      onClose();
    } catch (err) {
      console.error("Error updating post:", err);
      showApiError(err, "Không thể cập nhật bài viết. Vui lòng thử lại.", "Lỗi cập nhật");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Combine existing and new images for the grid
  const allImagePreviews = [
    ...existingImages.map(img => img.url),
    ...imagePreviews
  ];

  const hasAnyFiles = allImagePreviews.length > 0 || existingVideos.length > 0 || videoPreviews.length > 0 || existingDocuments.length > 0 || documentFiles.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] mx-4 max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="relative flex items-center justify-center p-4 border-b border-gray-200">
            <h2 className="text-[20px] font-bold text-gray-900">Chỉnh sửa bài viết</h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="absolute right-4 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* User Info & Privacy */}
            <div className="flex items-center gap-2 mb-4">
              <UserAvatar
                userId={user?.id}
                authorName={getDisplayName()}
                name={getDisplayName()}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-[15px] leading-tight mb-0.5">{getDisplayName()}</p>
                <div className="relative inline-block" ref={privacyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                    disabled={isLoading}
                  >
                    {privacy === 'open' && (
                      <>
                        <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        <span className="text-[13px] font-semibold text-gray-800">Công khai</span>
                      </>
                    )}
                    {privacy === 'friends' && (
                      <>
                        <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span className="text-[13px] font-semibold text-gray-800">Bạn bè</span>
                      </>
                    )}
                    {privacy === 'only_me' && (
                      <>
                        <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        <span className="text-[13px] font-semibold text-gray-800">Chỉ mình tôi</span>
                      </>
                    )}
                    <svg className="w-3 h-3 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                  </button>
                  {showPrivacyDropdown && (
                    <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10 py-2">
                      <button
                        type="button"
                        onClick={() => { setPrivacy('open'); setShowPrivacyDropdown(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 ${privacy === 'open' ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[15px] text-gray-900">Công khai</div>
                          <div className="text-[13px] text-gray-500">Mọi người trên hoặc ngoài ALM</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPrivacy('friends'); setShowPrivacyDropdown(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 ${privacy === 'friends' ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[15px] text-gray-900">Bạn bè</div>
                          <div className="text-[13px] text-gray-500">Chỉ bạn bè của bạn</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPrivacy('only_me'); setShowPrivacyDropdown(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 ${privacy === 'only_me' ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-[15px] text-gray-900">Chỉ mình tôi</div>
                          <div className="text-[13px] text-gray-500">Chỉ bạn mới có thể xem</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="relative mb-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`${getDisplayName().split(' ')[0]} ơi, bạn đang nghĩ gì thế?`}
                className={`w-full bg-white outline-none resize-none min-h-[60px] ${content.length < 85 ? 'text-[24px]' : 'text-[15px]'} placeholder-gray-500`}
                rows={1}
                style={{ overflow: 'hidden', height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 300) + 'px';
                }}
                disabled={isLoading}
              />
            </div>

            {/* File Previews (existing + new) */}
            {hasAnyFiles && (
              <div className="mt-3 border border-gray-200 rounded-lg p-2">
                <div className="relative">
                  {/* Combined image grid */}
                  {allImagePreviews.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-gray-100">
                      <ModernPhotoGrid
                        images={allImagePreviews}
                        onRemove={(index) => {
                          if (index < existingImages.length) {
                            // Remove existing image
                            const img = existingImages[index];
                            removeExistingFile(img.id, img.url, 'image');
                          } else {
                            // Remove new image
                            removeNewFile(index - existingImages.length, 'image');
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Existing videos */}
                  {existingVideos.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {existingVideos.map((video, index) => (
                        <div key={`existing-video-${index}`} className="relative group">
                          <video
                            src={video.url.startsWith('http') ? video.url : `http://localhost:8081${video.url}`}
                            className="w-full h-48 object-cover rounded-lg"
                            controls
                          />
                          <button
                            onClick={() => removeExistingFile(video.id, video.url, 'video')}
                            className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New video previews */}
                  {videoPreviews.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {videoPreviews.map((preview, index) => (
                        <div key={`new-video-${index}`} className="relative group">
                          <video src={preview} className="w-full h-48 object-cover rounded-lg" controls />
                          <button
                            onClick={() => removeNewFile(index, 'video')}
                            className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Existing documents */}
                  {existingDocuments.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {existingDocuments.map((doc, index) => (
                        <div key={`existing-doc-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-2xl">{getFileIcon({ type: doc.type } as File)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">File hiện tại</p>
                          </div>
                          <button
                            onClick={() => removeExistingFile(doc.id, doc.url, 'document')}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New document files */}
                  {documentFiles.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {documentFiles.map((file, index) => (
                        <div key={`new-doc-${index}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl">{getFileIcon(file)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            onClick={() => removeNewFile(index, 'document')}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clear all new files button */}
                  {files.length > 0 && (
                    <button onClick={clearAllNewFiles} className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 z-10">✕</button>
                  )}
                </div>
              </div>
            )}

            {/* Add to your post section */}
            <div className="mt-4 border border-gray-300 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <span className="font-semibold text-[15px] text-gray-900 ml-1">Thêm vào bài viết của bạn</span>
              <div className="flex items-center gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Ảnh/Video/Tài liệu" disabled={isLoading}>
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-4 mb-2">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className={`w-full py-2.5 rounded-lg font-semibold text-[15px] transition-colors ${
                  !content.trim() || isLoading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? "Đang cập nhật..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Notification Popup */}
      <NotificationPopup
        notification={notification}
        onClose={hideNotification}
      />
    </>
  );
}
