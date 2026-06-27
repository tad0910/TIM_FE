import { useState, useRef, useId, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { KeyboardEvent } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../../fontawesome';
import { createComment } from '../../services/commentsApi';
import type { Comment } from '../../types/post';
import UserAvatarWithModal from '../UserAvatarWithModal';
import { useCurrentAvatar } from '../../services/avatar';
import LinkPreview from '../LinkPreview';
import { getFirstUrl } from '../../utils/linkUtils';
import { useNotification } from '../../hooks/useNotification';
import NotificationPopup from '../NotificationPopup';

interface CommentInputProps {
  postId: string;
  onCommentAdded?: (comment: Comment) => void;
  className?: string;
}

const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '👍', '👎', '❤️', '💯', '🔥', '🎉', '✨', '⭐'
];

export default function CommentInput({ 
  postId, 
  onCommentAdded,
  className = '' 
}: CommentInputProps) {
  const { user } = useAuthStore();
  const avatarUrl = useCurrentAvatar();
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkPreviewUrl, setLinkPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputId = useId();
  const isSubmittingRef = useRef(false);
  const { notification, showSuccess, showApiError, hideNotification } = useNotification();

  useEffect(() => {
    const firstUrl = getFirstUrl(commentInput);
    setLinkPreviewUrl(firstUrl && !selectedFile ? firstUrl : null);
  }, [commentInput, selectedFile]);

  const handleSubmitComment = async () => {
    if ((!commentInput.trim() && !selectedFile) || !user?.id || isSubmitting || isSubmittingRef.current) return;

    const newCommentText = commentInput.trim();
    const fileToSubmit = selectedFile;
    
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const created = await createComment(postId, {
        userId: user.id,
        content: newCommentText || '',
        file: selectedFile,
      });

      const enriched: Comment = {
        ...created,
        id: String(created.id),
        userId: String(created.userId),
        username: created.username || user.username || 'Bạn',
        userAvatar: created.userAvatar ?? avatarUrl,
        mediaFiles: created.mediaFiles || created.files || [],
        files: created.files || created.mediaFiles || [],
      } as Comment;

      console.log('Comment created successfully:', enriched);
      console.log('onCommentAdded callback exists:', !!onCommentAdded);

      const currentPreviewUrl = previewUrl;

      if (onCommentAdded) {
        console.log('Calling onCommentAdded callback');
        onCommentAdded(enriched);
      } else {
        console.warn('onCommentAdded callback is not provided!');
      }

      flushSync(() => {
        console.log('Clearing form with flushSync');
        setCommentInput('');
        setSelectedFile(null);
        setPreviewUrl(null);
      });
      
      console.log('Form cleared, commentInput state should be empty');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (currentPreviewUrl) {
        try {
          URL.revokeObjectURL(currentPreviewUrl);
        } catch (err) {
          console.warn('Error revoking preview URL:', err);
        }
      }

      showSuccess('Đăng bình luận thành công', 'Bình luận của bạn đã được đăng.');

      setTimeout(() => {
        inputRef.current?.blur();
      }, 0);
    } catch (error) {
      console.error('Error creating comment:', error);
      setCommentInput(newCommentText);
      setSelectedFile(fileToSubmit);
      showApiError(error, 'Không thể đăng bình luận. Vui lòng thử lại.', 'Lỗi bình luận');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && (commentInput.trim() || selectedFile)) {
        handleSubmitComment();
      }
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const textarea = inputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = commentInput.substring(0, start);
      const textAfter = commentInput.substring(end);
      setCommentInput(textBefore + emoji + textAfter);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setCommentInput(commentInput + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previousPreviewUrl = previewUrl;
      if (previousPreviewUrl) {
        try {
          URL.revokeObjectURL(previousPreviewUrl);
        } catch (err) {
          console.warn('Error revoking previous preview URL:', err);
        }
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (err) {}
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    const currentPreviewUrl = previewUrl;
    if (currentPreviewUrl) {
      try {
        URL.revokeObjectURL(currentPreviewUrl);
      } catch (err) {
        console.warn('Error revoking preview URL in remove:', err);
      }
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!selectedFile && previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (err) {
        console.warn('Error revoking preview URL in sync:', err);
      }
      setPreviewUrl(null);
    }
  }, [selectedFile, previewUrl]);

  useEffect(() => {
    const currentPreviewUrl = previewUrl;
    return () => {
      if (currentPreviewUrl) {
        try {
          URL.revokeObjectURL(currentPreviewUrl);
        } catch (err) {
          console.warn('Error revoking preview URL on cleanup:', err);
        }
      }
    };
  }, [previewUrl]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  if (!user) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-4 text-gray-500 border-t">
          <p>Vui lòng đăng nhập để bình luận</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t pt-4 ${className}`}>
      <NotificationPopup notification={notification} onClose={hideNotification} />
      <div className="flex gap-3">
        <UserAvatarWithModal
          src={avatarUrl}
          userId={user.id}
          authorName={user.username || 'Bạn'}
          size="sm"
        />
        <div className="flex-1 relative">
          {previewUrl && (
            <div className="mb-2 relative inline-block">
              <div className="relative w-32 h-32 rounded-lg border border-gray-300 overflow-hidden">
                {selectedFile?.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-1 right-1 p-1 bg-gray-800 bg-opacity-75 text-white rounded-full hover:bg-red-500 text-xs"
                  title="Xóa"
                >
                  <FontAwesomeIcon icon={['fas', 'xmark']} />
                </button>
              </div>
            </div>
          )}
          
          {linkPreviewUrl && !previewUrl && (
            <div className="mb-2">
              <LinkPreview url={linkPreviewUrl} size="compact" lazy={false} />
            </div>
          )}
          
          <div className="border border-gray-300 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <textarea
              ref={inputRef}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Viết bình luận..."
              rows={2}
              disabled={isSubmitting}
              className="w-full px-4 py-2 rounded-lg resize-none focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between px-2 py-1 border-t">
              <div className="flex items-center gap-2 relative">
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded transition-colors"
                    title="Emoji"
                  >
                    <FontAwesomeIcon icon={['far', 'face-smile']} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 max-h-48 overflow-y-auto z-50">
                      <div className="grid grid-cols-8 gap-1">
                        {POPULAR_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="p-1 hover:bg-gray-100 rounded text-lg transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <label
                  htmlFor={fileInputId}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                  title="Tải ảnh/video"
                >
                  <FontAwesomeIcon icon={['fas', 'image']} />
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id={fileInputId}
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={(!commentInput.trim() && !selectedFile) || isSubmitting || isSubmittingRef.current}
                className={`
                  px-4 py-1.5 rounded-lg font-medium text-sm transition-colors
                  ${(commentInput.trim() || selectedFile) && !isSubmitting && !isSubmittingRef.current
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang gửi...
                  </span>
                ) : (
                  'Gửi'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

