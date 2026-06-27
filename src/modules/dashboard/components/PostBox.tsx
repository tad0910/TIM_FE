import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { createPost } from '../../../services/postApi';
import { validateFiles, isDocumentFile, getFileIcon, formatFileSize } from '../../../utils/fileValidation';
import { compressImage } from '../../../utils/imageCompression';
import { getUserProfile } from '../../../services/profileApi';
import { queryKeys } from '../../../hooks/api/queryKeys';
import UserAvatar from '../../../components/UserAvatar';
import NotificationPopup from '../../../components/NotificationPopup';
import { useNotification } from '../../../hooks/useNotification';
import LinkPreview from '../../../components/LinkPreview';
import { getFirstUrl } from '../../../utils/linkUtils';
import type { UserProfile } from '../../../types/profile';
import { awardPoints } from '../../../services/gamificationApi';
import { getBehaviorIdByCode } from '../../../utils/behaviorSettings';

interface PostBoxProps {
	onPostCreated: () => void;
	marginTop?: string | number;
}

export default function PostBox({ onPostCreated, marginTop = '10px' }: PostBoxProps) {
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [content, setContent] = useState('');
	const [privacy, setPrivacy] = useState<'open' | 'friends' | 'only_me'>('open');
	const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [imagePreviews, setImagePreviews] = useState<string[]>([]);
	const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
	const [documentFiles, setDocumentFiles] = useState<File[]>([]);
	const [isPosting, setIsPosting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [linkPreviewUrl, setLinkPreviewUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const privacyDropdownRef = useRef<HTMLDivElement>(null);
	
	const { user } = useAuthStore();
	const { notification, hideNotification, showSuccess, showWarning, showApiError } = useNotification();
	
	// React Query: Fetch user profile for avatar
	const {
		data: userProfile,
	} = useQuery<UserProfile>({
		queryKey: queryKeys.profile.detail(user?.id || ''),
		queryFn: async () => {
			if (!user?.id) throw new Error('No userId available');
			return getUserProfile(user.id);
		},
		enabled: Boolean(user?.id),
		staleTime: 60_000, // Cache lâu hơn vì avatar ít thay đổi
		refetchOnWindowFocus: false,
	});
	useEffect(() => {
		const firstUrl = getFirstUrl(content);
		setLinkPreviewUrl(firstUrl);
	}, [content]);
	
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
	
	useEffect(() => {
		if (!showCreateModal) {
			setPrivacy('open');
			setShowPrivacyDropdown(false);
		}
	}, [showCreateModal]);
	
	const getDisplayName = () => {
		return user?.username || 'Người dùng';
	};

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
			showApiError(error, 'Có lỗi xảy ra khi xử lý file. Vui lòng thử lại.', 'Lỗi xử lý file');
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const removeFile = (index: number, type: 'image' | 'video' | 'document') => {
		if (type === 'image') {
			URL.revokeObjectURL(imagePreviews[index]);
			const newPreviews = imagePreviews.filter((_, i) => i !== index);
			const newFiles = files.filter((file) => {
				const imageFiles = files.filter(f => f.type.startsWith('image/'));
				const imageIndex = imageFiles.indexOf(file);
				return imageIndex !== index;
			});
			setImagePreviews(newPreviews);
			setFiles(newFiles);
		} else if (type === 'video') {
			URL.revokeObjectURL(videoPreviews[index]);
			const newPreviews = videoPreviews.filter((_, i) => i !== index);
			const newFiles = files.filter((file) => {
				const videoFiles = files.filter(f => f.type.startsWith('video/'));
				const videoIndex = videoFiles.indexOf(file);
				return videoIndex !== index;
			});
			setVideoPreviews(newPreviews);
			setFiles(newFiles);
		} else if (type === 'document') {
			const newFiles = documentFiles.filter((_, i) => i !== index);
			const newAllFiles = files.filter((file) => {
				const docFiles = files.filter(f => isDocumentFile(f));
				const docIndex = docFiles.indexOf(file);
				return docIndex !== index;
			});
			setDocumentFiles(newFiles);
			setFiles(newAllFiles);
		}
	};

	const clearAllFiles = () => {
		imagePreviews.forEach(url => URL.revokeObjectURL(url));
		videoPreviews.forEach(url => URL.revokeObjectURL(url));
		
		setFiles([]);
		setImagePreviews([]);
		setVideoPreviews([]);
		setDocumentFiles([]);
		setLinkPreviewUrl(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!content.trim() && files.length === 0) {
			showWarning('Thiếu nội dung', 'Vui lòng nhập nội dung hoặc chọn file để đăng bài');
			return;
		}

		setIsPosting(true);
		setUploadProgress(0);

		try {
			const compressedFiles: File[] = [];
			const originalFilenames: string[] = [];

			for (const file of files) {
				if (file.type.startsWith('image/')) {
					const compressed = await compressImage(file);
					compressedFiles.push(compressed);
					originalFilenames.push(file.name);
				} else {
					compressedFiles.push(file);
					originalFilenames.push(file.name);
				}
			}

			console.log('Final files to upload:', compressedFiles.length, 'files');

			const formData = new FormData();
			formData.append('content', content);
			formData.append('privacy', privacy);

			compressedFiles.forEach((file) => {
				formData.append('files', file);
			});

			const post = await createPost({
				userId: user?.id || '',
				content,
				files: compressedFiles,
				privacy: privacy
			});
			
			if (originalFilenames.length > 0) {
				const postId = post.id || String(Date.now());
				localStorage.setItem(`post_${postId}_filenames`, JSON.stringify(originalFilenames));
			}

			console.log('Post created successfully:', post);
			
				if (user?.id) {
					try {
						if (linkPreviewUrl) {
							const behaviorId = getBehaviorIdByCode('POST_SHARE');
							if (behaviorId) {
								await awardPoints({ userId: Number(user.id), behaviorId });
							} else {
								console.warn('POST_SHARE behaviorId not configured; skipping award');
							}
						}
					} catch (error) {
						console.error('Error awarding points for post:', error);
					}
				}
			
			setContent("");
			setPrivacy('open');
			setFiles([]);
			setImagePreviews([]);
			setVideoPreviews([]);
			setDocumentFiles([]);
			setLinkPreviewUrl(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			
			setShowCreateModal(false);
			
			onPostCreated();
			
			showSuccess("Đăng bài thành công!", "Bài viết đã được đăng thành công");
		} catch (error) {
			console.error("Error creating post:", error);
			
			if (error instanceof Error) {
				if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
					showWarning('File quá lớn', 'Giới hạn kích thước file. Vui lòng thử lại.');
				} else if (error.message.includes('timeout')) {
					showWarning('Upload timeout', 'File quá lớn hoặc kết nối chậm. Vui lòng thử lại.');
				} else {
					showApiError(error, 'Có lỗi xảy ra khi đăng bài. Vui lòng thử lại sau.', 'Lỗi upload');
				}
			} else {
				showApiError(error, 'Có lỗi xảy ra khi đăng bài. Vui lòng thử lại sau.', 'Lỗi đăng bài');
			}
		} finally {
			setIsPosting(false);
			setUploadProgress(0);
		}
	};

	return (
		<>
			<div className="bg-white rounded-2xl shadow-lg p-4" style={{ marginTop: typeof marginTop === 'string' ? marginTop : `${marginTop}px` }}>
				<div className="flex gap-3">
					<UserAvatar 
						userId={user?.id}
						authorName={getDisplayName()}
						src={userProfile?.avatar || userProfile?.profileImage || ''}
						name={getDisplayName()}
						className="w-10 h-10 rounded-full object-cover"
					/>
					<div 
						className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors"
						onClick={() => setShowCreateModal(true)}
					>
						<span className="text-gray-500">Bạn đang nghĩ gì?</span>
					</div>
				</div>
			</div>

			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between p-4 border-b">
							<h2 className="text-xl font-semibold">Tạo bài viết</h2>
							<button
								onClick={() => setShowCreateModal(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>

						<div className="flex items-center justify-between p-4">
							<div className="flex items-center gap-3">
								<UserAvatar 
									userId={user?.id}
									authorName={getDisplayName()}
									src={userProfile?.avatar || userProfile?.profileImage || ''}
									name={getDisplayName()}
									className="w-10 h-10 rounded-full object-cover"
								/>
								<div>
									<p className="font-semibold">{getDisplayName()}</p>
								</div>
							</div>
							<div className="relative" ref={privacyDropdownRef}>
								<button
									type="button"
									onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
									className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									disabled={isPosting}
								>
									<span className="text-sm">
										{privacy === 'open' && '🌍 Công khai'}
										{privacy === 'friends' && '👥 Bạn bè'}
										{privacy === 'only_me' && '🔒 Chỉ mình tôi'}
									</span>
									<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{showPrivacyDropdown && (
									<div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
										<div className="py-1">
											<button
												type="button"
												onClick={() => {
													setPrivacy('open');
													setShowPrivacyDropdown(false);
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
													privacy === 'open' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
												}`}
											>
												<span>🌍</span>
												<div>
													<div className="font-medium">Công khai</div>
													<div className="text-xs text-gray-500">Mọi người đều có thể xem</div>
												</div>
											</button>
											<button
												type="button"
												onClick={() => {
													setPrivacy('friends');
													setShowPrivacyDropdown(false);
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
													privacy === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
												}`}
											>
												<span>👥</span>
												<div>
													<div className="font-medium">Bạn bè</div>
													<div className="text-xs text-gray-500">Chỉ bạn bè có thể xem</div>
												</div>
											</button>
											<button
												type="button"
												onClick={() => {
													setPrivacy('only_me');
													setShowPrivacyDropdown(false);
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
													privacy === 'only_me' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
												}`}
											>
												<span>🔒</span>
												<div>
													<div className="font-medium">Chỉ mình tôi</div>
													<div className="text-xs text-gray-500">Chỉ bạn có thể xem</div>
												</div>
											</button>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="px-4">
							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder="Bạn đang nghĩ gì?"
								className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none resize-none min-h-[120px] max-h-[300px]"
								rows={5}
								style={{
									overflow: 'hidden',
									height: 'auto'
								}}
								onInput={(e) => {
									const target = e.target as HTMLTextAreaElement;
									target.style.height = 'auto';
									target.style.height = Math.min(target.scrollHeight, 300) + 'px';
								}}
							/>
						</div>

						{linkPreviewUrl && files.length === 0 && !isPosting && (
							<div className="px-4 py-2">
								<div className="relative">
									<LinkPreview url={linkPreviewUrl} className="max-w-2xl" />
									<button
										onClick={() => {
											const urlRegex = /(https?:\/\/[^\s]+)/g;
											setContent(content.replace(urlRegex, '').trim());
										}}
										className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-100 transition-opacity"
										title="Xóa link preview"
									>
										×
									</button>
								</div>
							</div>
						)}

						{files.length === 0 && !linkPreviewUrl && !isPosting && (
							<div className="px-4 py-2">
								<div 
									className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
									onClick={() => fileInputRef.current?.click()}
								>
									<svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<p className="text-gray-600">Kéo thả file vào đây hoặc click để chọn</p>
									<p className="text-sm text-gray-400 mt-1">Hỗ trợ: ảnh, video, PDF, DOC, XLS, PPT, TXT, ZIP</p>
								</div>
							</div>
						)}

						{files.length > 0 && (
							<div className="px-4 py-2">
								{imagePreviews.length > 0 && (
									<div className="mb-4">
										<h3 className="text-sm font-medium text-gray-700 mb-2">Hình ảnh</h3>
										<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
											{imagePreviews.map((preview, index) => (
												<div key={index} className="relative group">
													<img
														src={preview}
														alt={`Preview ${index + 1}`}
														className="w-full h-24 object-cover rounded-lg"
													/>
													<button
														onClick={() => removeFile(index, 'image')}
														className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
													>
														×
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								{videoPreviews.length > 0 && (
									<div className="mb-4">
										<h3 className="text-sm font-medium text-gray-700 mb-2">Video</h3>
										<div className="space-y-2">
											{videoPreviews.map((preview, index) => (
												<div key={index} className="relative group">
													<video
														src={preview}
														className="w-full h-32 object-cover rounded-lg"
														controls
													/>
													<button
														onClick={() => removeFile(index, 'video')}
														className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
													>
														×
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								{documentFiles.length > 0 && (
									<div className="mb-4">
										<h3 className="text-sm font-medium text-gray-700 mb-2">Tài liệu</h3>
										<div className="space-y-2">
											{documentFiles.map((file, index) => (
												<div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
													<div className="text-2xl">{getFileIcon(file)}</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
														<p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
													</div>
													<button
														onClick={() => removeFile(index, 'document')}
														className="text-red-500 hover:text-red-700"
													>
														×
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								<button
									onClick={clearAllFiles}
									className="text-sm text-red-500 hover:text-red-700"
								>
									Xóa tất cả
								</button>
							</div>
						)}

						{isPosting && (
							<div className="px-4 py-2">
								<div className="bg-gray-200 rounded-full h-2">
									<div 
										className="bg-blue-500 h-2 rounded-full transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									/>
								</div>
								<p className="text-sm text-gray-600 mt-1">Đang đăng bài...</p>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex items-center justify-between p-4 border-t">
							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
									disabled={isPosting}
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span className="text-sm">Đính kèm</span>
								</button>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="px-4 py-2 text-gray-600 hover:text-gray-800"
									disabled={isPosting}
								>
									Hủy
								</button>
								<button
									onClick={handleSubmit}
									disabled={isPosting || (!content.trim() && files.length === 0)}
									className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
								>
									{isPosting ? 'Đang đăng...' : 'Đăng'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

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
