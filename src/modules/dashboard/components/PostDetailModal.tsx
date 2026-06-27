// import { useState, useEffect, useCallback } from 'react';
// import { getPostById } from '../../../services/postApi';
// import { useAuthStore } from '../../../store/useAuthStore';
// import type { Post } from '../../../types/post';
// import UserAvatarWithModal from '../../../components/UserAvatarWithModal';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import '../../../fontawesome';
// import ReactionBar from './ReactionBar';
// import reactionsApi, { type EmotionType } from '../../../services/reactionsApi';
// import ReactionCounts from './ReactionCounts';
// import CommentsModal from './CommentsModal';

// interface PostDetailModalProps {
//   post: Post;
//   isOpen: boolean;
//   onClose: () => void;
// }

// export default function PostDetailModal({ 
//   post, 
//   isOpen, 
//   onClose
// }: PostDetailModalProps) {
//   const { user } = useAuthStore();
//   const [detailedPost, setDetailedPost] = useState<Post | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [showReactionBar, setShowReactionBar] = useState(false);
//   const [showComments, setShowComments] = useState(false);

//   const loadDetailedPost = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       console.log('PostDetailModal: Loading post with ID:', post.id, 'for user:', user!.id);
//       const postData = await getPostById(post.id);
//       console.log('PostDetailModal: Loaded post data:', postData);
//       console.log('PostDetailModal: Author data:', {
//         author: postData.author,
//         avatar: postData.author?.avatar,
//         name: postData.author?.name
//       });
//       setDetailedPost(postData);
//     } catch (err) {
//       console.error('Error loading detailed post:', err);
//       setError('Không thể tải thông tin chi tiết bài viết');
//     } finally {
//       setLoading(false);
//     }
//   }, [post.id, user]);

//   useEffect(() => {
//     if (isOpen && user?.id) {
//       loadDetailedPost();
//     }
//   }, [isOpen, user?.id, loadDetailedPost]);

//   const handleReactionSelect = async (emotion: EmotionType) => {
//     if (!user?.id || !detailedPost) return;

//     try {
//       // Check if user already reacted by getting all reactions and finding user's reaction
//       const reactions = await reactionsApi.getReactionsByPostId(detailedPost.id);
//       const userReaction = reactions.find(r => r.userId === user.id);
      
//       if (userReaction && userReaction.emotionType === emotion) {
//         // Remove reaction
//         await reactionsApi.deletePostReaction(detailedPost.id, { userId: user.id });
//       } else {
//         // Add or update reaction
//         await reactionsApi.createOrUpdatePostReaction(detailedPost.id, { userId: user.id, emotionType: emotion });
//       }
      
//       // Reload post data to get updated reaction counts
//       await loadDetailedPost();
//     } catch (err) {
//       console.error('Error reacting to post:', err);
//     }
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleString('vi-VN', {
//       day: 'numeric', month: 'numeric', year: 'numeric',
//       hour: 'numeric', minute: 'numeric'
//     });
//   };

//   const getPrivacyLabel = (privacy: string) => {
//     switch (privacy) {
//       case 'open': return 'Công khai';
//       case 'friends': return 'Bạn bè';
//       case 'only_me': return 'Chỉ mình tôi';
//       default: return 'Không xác định';
//     }
//   };

//   const getFileIcon = (fileType: string) => {
//     switch (fileType) {
//       case 'IMAGE': return '🖼️';
//       case 'VIDEO': return '🎥';
//       case 'DOCUMENT': return '📄';
//       default: return '📎';
//     }
//   };

//   const getFileTypeLabel = (fileType: string) => {
//     switch (fileType) {
//       case 'IMAGE': return 'Hình ảnh';
//       case 'VIDEO': return 'Video';
//       case 'DOCUMENT': return 'Tài liệu';
//       default: return 'File';
//     }
//   };

//   const hasMediaFiles = () => {
//     if (!detailedPost) return false;
    
//     // Check for legacy image/video fields
//     const hasLegacyMedia = detailedPost.image || detailedPost.images?.length || 
//                           detailedPost.video || detailedPost.videos?.length;
    
//     return hasLegacyMedia;
//   };

//   const getMediaFiles = () => {
//     if (!detailedPost) return [];
    
//     // Include legacy image/video fields
//     const legacyImages = detailedPost.images || (detailedPost.image ? [detailedPost.image] : []);
//     const legacyVideos = detailedPost.videos || (detailedPost.video ? [detailedPost.video] : []);
    
//     // Convert legacy fields to file-like objects
//     const legacyMediaFiles = [
//       ...legacyImages.map((url, index) => ({
//         id: `legacy-image-${index}`,
//         fileUrl: url,
//         fileType: 'IMAGE'
//       })),
//       ...legacyVideos.map((url, index) => ({
//         id: `legacy-video-${index}`,
//         fileUrl: url,
//         fileType: 'VIDEO'
//       }))
//     ];
    
//     return legacyMediaFiles;
//   };

//   const getDocumentFiles = () => {
//     return detailedPost?.documents || [];
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg w-full max-w-7xl h-[95vh] flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b">
//           <h2 className="text-xl font-semibold">Chi tiết bài viết</h2>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 text-2xl"
//           >
//             ×
//           </button>
//         </div>

//         {/* Content */}
//         <div className="flex-1 flex overflow-hidden">
//           {/* Left Side - Media */}
//           <div className="w-1/2 bg-gray-100 flex items-center justify-center">
//             {loading ? (
//               <div className="text-center">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
//                 <p className="mt-4 text-gray-600">Đang tải...</p>
//               </div>
//             ) : error ? (
//               <div className="text-center">
//                 <div className="text-red-600 text-4xl mb-2">❌</div>
//                 <p className="text-red-600">{error}</p>
//               </div>
//             ) : hasMediaFiles() ? (
//               <div className="w-full h-full flex items-center justify-center">
//                 {getMediaFiles().map((file, index) => (
//                   <div key={index} className="w-full h-full flex items-center justify-center">
//                     {file.fileType === 'IMAGE' ? (
//                       <img
//                         src={file.fileUrl.startsWith('http') ? file.fileUrl : `http://localhost:8081${file.fileUrl}`}
//                         alt="Post media"
//                         className="max-w-full max-h-full object-contain"
//                         onError={(e) => {
//                           console.error('Image load error:', file.fileUrl);
//                           (e.target as HTMLImageElement).style.display = 'none';
//                         }}
//                       />
//                     ) : file.fileType === 'VIDEO' ? (
//                       <video
//                         src={file.fileUrl.startsWith('http') ? file.fileUrl : `http://localhost:8081${file.fileUrl}`}
//                         controls
//                         className="max-w-full max-h-full"
//                         onError={() => {
//                           console.error('Video load error:', file.fileUrl);
//                         }}
//                       />
//                     ) : null}
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center text-gray-500">
//                 <div className="text-4xl mb-2">📷</div>
//                 <p>Không có media để hiển thị</p>
//               </div>
//             )}
//           </div>

//           {/* Right Side - Post Info & Comments */}
//           <div className="w-1/2 flex flex-col">
//             {/* Post Content */}
//             <div className="flex-1 p-4 overflow-y-auto">
//               {detailedPost && (
//                 <>
//                   {/* Author Info */}
//                   <div className="flex items-center space-x-3 mb-4">
//                     <UserAvatarWithModal
//                       src={detailedPost.author?.avatar}
//                       userId={detailedPost.author?.id}
//                       name={detailedPost.author?.name}
//                       size="md"
//                     />
//                     <div className="flex-1">
//                       <h3 className="font-semibold text-gray-900">
//                         {detailedPost.author?.name || 'Người dùng'}
//                       </h3>
//                       <div className="flex items-center space-x-2 text-sm text-gray-500">
//                         <span>{formatDate(detailedPost.createdAt)}</span>
//                         <span>•</span>
//                         <span>{getPrivacyLabel(detailedPost.privacy)}</span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Post Content */}
//                   <div className="mb-4">
//                     <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
//                       {detailedPost.content}
//                     </p>
//                   </div>

//                   {/* Documents */}
//                   {getDocumentFiles().length > 0 && (
//                     <div className="mb-4">
//                       <h4 className="font-medium text-gray-700 mb-2">Tài liệu đính kèm:</h4>
//                       <div className="space-y-2">
//                         {getDocumentFiles().map((file, index) => (
//                           <a
//                             key={index}
//                             href={file.url.startsWith('http') ? file.url : `http://localhost:8081${file.url}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
//                           >
//                             <span className="text-lg">{getFileIcon(file.type)}</span>
//                             <span className="text-sm text-blue-600 hover:underline">
//                               {getFileTypeLabel(file.type)} - {file.name}
//                             </span>
//                           </a>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {/* Reactions */}
//                   <div className="mb-4">
//                     <ReactionCounts
//                       postId={detailedPost.id}
//                       reactions={detailedPost.reactions}
//                       onOpenReactionsModal={() => setShowReactionBar(!showReactionBar)}
//                     />
//                     {showReactionBar && (
//                       <div className="mt-2">
//                         <ReactionBar onSelect={handleReactionSelect} />
//                       </div>
//                     )}
//                   </div>

//                   {/* Comments Preview */}
//                   <div className="border-t pt-4">
//                     <div className="flex items-center justify-between mb-3">
//                       <h4 className="font-medium text-gray-900">
//                         Bình luận ({detailedPost.comments?.length || 0})
//                       </h4>
//                       {detailedPost.comments && detailedPost.comments.length > 3 && (
//                         <button
//                           onClick={() => setShowComments(true)}
//                           className="text-blue-600 hover:underline text-sm"
//                         >
//                           Xem tất cả
//                         </button>
//                       )}
//                     </div>

//                     {/* Recent Comments */}
//                     <div className="space-y-3 max-h-64 overflow-y-auto">
//                       {detailedPost.comments?.slice(0, 3).map((comment, index) => (
//                         <div key={index} className="flex space-x-2">
//                           <UserAvatarWithModal
//                             src={comment.userAvatar}
//                             userId={comment.userId}
//                             name={comment.username}
//                             size="sm"
//                           />
//                           <div className="flex-1">
//                             <div className="bg-gray-50 rounded-lg p-2">
//                               <div className="flex items-center space-x-2 mb-1">
//                                 <span className="font-medium text-sm text-gray-900">
//                                   {comment.username || 'Người dùng'}
//                                 </span>
//                                 <span className="text-xs text-gray-500">
//                                   {formatDate(comment.createdAt)}
//                                 </span>
//                               </div>
//                               <p className="text-sm text-gray-800 whitespace-pre-wrap">
//                                 {comment.content}
//                               </p>
//                               {comment.emotion && (
//                                 <div className="mt-1">
//                                   <span className="text-lg">{comment.emotion}</span>
//                                 </div>
//                               )}
//                             </div>
                            
//                             {/* Reply Comments */}
//                             {comment.replyComments && comment.replyComments.length > 0 && (
//                               <div className="ml-4 mt-2 space-y-2">
//                                 {comment.replyComments.slice(0, 2).map((reply, replyIndex) => (
//                                   <div key={replyIndex} className="flex space-x-2">
//                                     <UserAvatarWithModal
//                                       src={reply.userAvatar}
//                                       userId={reply.userId}
//                                       name={reply.username || "Người dùng"}
//                                       size="xs"
//                                     />
//                                     <div className="flex-1">
//                                       <div className="bg-gray-100 rounded-lg p-2">
//                                         <div className="flex items-center space-x-2 mb-1">
//                                           <span className="font-medium text-xs text-gray-900">
//                                             Người dùng
//                                           </span>
//                                           <span className="text-xs text-gray-500">
//                                             {formatDate(reply.createdAt)}
//                                           </span>
//                                         </div>
//                                         <p className="text-xs text-gray-700 whitespace-pre-wrap">
//                                           {reply.content}
//                                         </p>
//                                         {reply.emotion && (
//                                           <div className="mt-1">
//                                             <span className="text-sm">{reply.emotion}</span>
//                                           </div>
//                                         )}
//                                       </div>
//                                     </div>
//                                   </div>
//                                 ))}
//                                 {comment.replyComments.length > 2 && (
//                                   <div className="text-xs text-gray-500 ml-6">
//                                     ... và {comment.replyComments.length - 2} phản hồi khác
//                                   </div>
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       ))}
                      
//                       {(!detailedPost.comments || detailedPost.comments.length === 0) && (
//                         <div className="text-center text-gray-500 py-4">
//                           <div className="text-2xl mb-2">💬</div>
//                           <p className="text-sm">Chưa có bình luận nào</p>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>

//             {/* Footer: Comment Input & Actions */}
//             <div className="p-4 border-t">
//               <div className="flex items-center space-x-4">
//                 <button
//                   onClick={() => setShowReactionBar(!showReactionBar)}
//                   className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
//                 >
//                   <FontAwesomeIcon icon="thumbs-up" />
//                   <span>Thích</span>
//                 </button>
//                 <button
//                   onClick={() => setShowComments(true)}
//                   className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
//                 >
//                   <FontAwesomeIcon icon="comment" />
//                   <span>Bình luận</span>
//                 </button>
//                 <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
//                   <FontAwesomeIcon icon="share" />
//                   <span>Chia sẻ</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Full Comments Modal */}
//       {detailedPost && (
//         <CommentsModal
//           isOpen={showComments}
//           onClose={() => setShowComments(false)}
//           postId={detailedPost.id}
//         />
//       )}
//     </div>
//   );
// }
