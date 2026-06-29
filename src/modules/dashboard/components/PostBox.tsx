import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { createPost } from '../../../services/postApi';
import { validateFiles, isDocumentFile, getFileIcon, formatFileSize } from '../../../utils/fileValidation';
import { compressImage } from '../../../utils/imageCompression';
import { getUserProfile } from '../../../services/profileApi';
import { queryKeys } from '../../../hooks/api/queryKeys';
import UserAvatar from '../../../components/UserAvatar';
import ModernPhotoGrid from '../../../components/ModernPhotoGrid';
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
		setShowCreateModal(false);
		showInfo("Đang đăng bài...", "Bài viết của bạn đang được xử lý", 0); // 0 means it won't auto-close

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
			setShowCreateModal(true); // Re-open so they don't lose their draft if they want to edit
		} finally {
			setIsPosting(false);
			setUploadProgress(0);
		}
	};

	return (
		<>
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" style={{ marginTop: typeof marginTop === 'string' ? marginTop : `${marginTop}px` }}>
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
					<div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] mx-4 max-h-[90vh] flex flex-col overflow-hidden">
						{/* Header */}
						<div className="relative flex items-center justify-center p-4 border-b border-gray-200">
							<h2 className="text-[20px] font-bold text-gray-900">Tạo bài viết</h2>
							<button
								onClick={() => setShowCreateModal(false)}
								className="absolute right-4 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 transition-colors"
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
									src={userProfile?.avatar || userProfile?.profileImage || ''}
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
											disabled={isPosting}
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
							<div className="relative mb-3">
								<textarea
									value={content}
									onChange={(e) => setContent(e.target.value)}
									placeholder={`${getDisplayName().split(' ')[0]} ơi, bạn đang nghĩ gì thế?`}
									className={`w-full bg-white outline-none resize-none min-h-[150px] ${content.length < 85 ? 'text-[24px]' : 'text-[15px]'} placeholder-gray-500`}
									rows={3}
									style={{ overflow: 'hidden', height: 'auto' }}
									onInput={(e) => {
										const target = e.target as HTMLTextAreaElement;
										target.style.height = 'auto';
										target.style.height = Math.min(target.scrollHeight, 300) + 'px';
									}}
								/>
							</div>

							{linkPreviewUrl && files.length === 0 && !isPosting && (
								<div className="mt-3 relative border border-gray-200 rounded-lg overflow-hidden">
									<LinkPreview url={linkPreviewUrl} className="w-full" />
									<button
										onClick={() => {
											const urlRegex = /(https?:\/\/[^\s]+)/g;
											setContent(content.replace(urlRegex, '').trim());
										}}
										className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
										title="Xóa link preview"
									>
										✕
									</button>
								</div>
							)}

							{/* File Previews */}
							{files.length > 0 && (
								<div className="mt-3 border border-gray-200 rounded-lg p-2">
									<div className="relative">
										{imagePreviews.length > 0 && (
											<div className="rounded-lg overflow-hidden border border-gray-100">
												<ModernPhotoGrid
													images={imagePreviews}
													onRemove={(index) => removeFile(index, 'image')}
												/>
											</div>
										)}
										{videoPreviews.length > 0 && (
											<div className="space-y-1 mt-1">
												{videoPreviews.map((preview, index) => (
													<div key={index} className="relative group">
														<video src={preview} className="w-full h-48 object-cover rounded-lg" controls />
														<button
															onClick={() => removeFile(index, 'video')}
															className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 opacity-0 group-hover:opacity-100"
														>
															✕
														</button>
													</div>
												))}
											</div>
										)}
										{documentFiles.length > 0 && (
											<div className="space-y-1 mt-1">
												{documentFiles.map((file, index) => (
													<div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
														<div className="text-2xl">{getFileIcon(file)}</div>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
															<p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
														</div>
														<button
															onClick={() => removeFile(index, 'document')}
															className="text-red-500 hover:text-red-700 p-2"
														>
															✕
														</button>
													</div>
												))}
											</div>
										)}
										<button onClick={clearAllFiles} className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 z-10">✕</button>
									</div>
								</div>
							)}


							{/* Add to your post section */}
							<div className="mt-4 border border-gray-300 rounded-lg p-3 flex items-center justify-between shadow-sm">
								<span className="font-semibold text-[15px] text-gray-900 ml-1">Thêm vào bài viết của bạn</span>
								<div className="flex items-center gap-1">
									<button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors tooltip-trigger relative" title="Ảnh/Video/Tài liệu">
										<svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
									</button>
								</div>
							</div>

							{/* Submit Button */}
							<div className="mt-4 mb-2">
								<button
									onClick={handleSubmit}
									disabled={isPosting || (!content.trim() && files.length === 0)}
									className={`w-full py-2.5 rounded-lg font-semibold text-[15px] transition-colors ${
										(!content.trim() && files.length === 0) || isPosting
											? 'bg-gray-200 text-gray-400 cursor-not-allowed'
											: 'bg-blue-600 text-white hover:bg-blue-700'
									}`}
								>
									Đăng
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
