import { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { getPostsByUser } from '../../../services/postApi';
import { getPersonalImages } from '../../../services/profileApi';
import MediaTimeline from './MediaTimeline';
import MediaAlbum from './MediaAlbum';
import MediaCarousel from './MediaCarousel';
import MediaMasonry from './MediaMasonry';
import MediaList from './MediaList';
import MediaCard from './MediaCard';
import VideoModal from './VideoModal';

interface MediaStorageProps {
  userId: string;
}

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  category: 'avatar' | 'cover' | 'personal' | 'post';
  size?: number;
  createdAt: string;
  postId?: string;
  postContent?: string;
  description?: string;
  fileExtension?: string;
}

type MediaFilter = 'all' | 'images' | 'videos' | 'documents';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (url: string | unknown): string => {
  if (typeof url === 'string') {
    return url.split('.').pop()?.toLowerCase() || '';
  }
  
  if (url && typeof url === 'object') {
    const fileObj = url as { fileUrl?: string; url?: string; path?: string; filename?: string; name?: string };
    const filePath = fileObj.fileUrl || fileObj.url || fileObj.path || fileObj.filename || fileObj.name;
    if (filePath && typeof filePath === 'string') {
      return filePath.split('.').pop()?.toLowerCase() || '';
    }
  }
  
  return '';
};

const extractUrl = (item: string | unknown): string => {
  if (typeof item === 'string') {
    return item;
  }
  
  if (item && typeof item === 'object') {
    const fileObj = item as { fileUrl?: string; url?: string; path?: string; filename?: string; name?: string };
    return fileObj.fileUrl || fileObj.url || fileObj.path || fileObj.filename || fileObj.name || '';
  }
  
  return '';
};

const isVideoFile = (extension: string): boolean => {
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension);
};

const isDocumentFile = (extension: string): boolean => {
  return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension);
};

const getImageUrl = (url: string): string => {
  return resolveMediaUrl(url) || url;
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Vừa xong";
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} năm trước`;
};

const filterByDate = (items: MediaItem[], filter: DateFilter): MediaItem[] => {
  if (filter === 'all') return items;
  
  const now = new Date();
  const filterDate = new Date();
  
  switch (filter) {
    case 'today':
      filterDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      filterDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      filterDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      filterDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return items.filter(item => new Date(item.createdAt) >= filterDate);
};

const filterBySize = (items: MediaItem[], filter: SizeFilter): MediaItem[] => {
  if (filter === 'all') return items;
  
  return items.filter(item => {
    if (!item.size) return true;
    
    const sizeInMB = item.size / (1024 * 1024);
    
    switch (filter) {
      case 'small':
        return sizeInMB < 1;
      case 'medium':
        return sizeInMB >= 1 && sizeInMB < 10;
      case 'large':
        return sizeInMB >= 10;
      default:
        return true;
    }
  });
};

export default function MediaStorage({ userId }: MediaStorageProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'album' | 'carousel' | 'masonry' | 'list' | 'card'>('grid');
  
  const [stats, setStats] = useState({
    total: 0,
    images: 0,
    videos: 0,
    documents: 0,
    totalSize: 0
  });

  useEffect(() => {
    loadMediaItems();
  }, [userId]);

  const loadMediaItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allItems: MediaItem[] = [];
      
      const posts = await getPostsByUser(userId);
      
      posts.forEach(post => {
        try {
          const processedUrls = new Set<string>();
          
          if (post.image && typeof post.image === 'string' && !processedUrls.has(post.image)) {
            const extension = getFileExtension(post.image);
            allItems.push({
              id: `${post.id}-single`,
              url: post.image,
              type: isVideoFile(extension) ? 'video' : isDocumentFile(extension) ? 'document' : 'image',
              category: 'post',
              createdAt: post.createdAt,
              postId: post.id,
              postContent: post.content,
              fileExtension: extension
            });
            processedUrls.add(post.image);
          }

          if (post.video && typeof post.video === 'string' && !processedUrls.has(post.video)) {
            const extension = getFileExtension(post.video);
            allItems.push({
              id: `${post.id}-single-video`,
              url: post.video,
              type: 'video',
              category: 'post',
              createdAt: post.createdAt,
              postId: post.id,
              postContent: post.content,
              fileExtension: extension
            });
            processedUrls.add(post.video);
          }

          if (post.images && Array.isArray(post.images) && post.images.length > 0) {
            post.images.forEach((image, index) => {
              if (typeof image === 'string' && !processedUrls.has(image)) {
                const extension = getFileExtension(image);
                allItems.push({
                  id: `${post.id}-image-${index}`,
                  url: image,
                  type: isVideoFile(extension) ? 'video' : isDocumentFile(extension) ? 'document' : 'image',
                  category: 'post',
                  createdAt: post.createdAt,
                  postId: post.id,
                  postContent: post.content,
                  fileExtension: extension
                });
                processedUrls.add(image);
              }
            });
          }

          if (post.files && Array.isArray(post.files) && post.files.length > 0) {
            post.files.forEach((file, index) => {
              const fileUrl = extractUrl(file);
              if (!fileUrl) return;
              
              if (!processedUrls.has(fileUrl)) {
                const extension = getFileExtension(fileUrl);
                allItems.push({
                  id: `${post.id}-file-${index}`,
                  url: fileUrl,
                  type: isVideoFile(extension) ? 'video' : isDocumentFile(extension) ? 'document' : 'image',
                  category: 'post',
                  createdAt: post.createdAt,
                  postId: post.id,
                  postContent: post.content,
                  fileExtension: extension
                });
                processedUrls.add(fileUrl);
              }
            });
          }

          if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
            post.videos.forEach((video, index) => {
              if (typeof video === 'string' && !processedUrls.has(video)) {
                const extension = getFileExtension(video);
                allItems.push({
                  id: `${post.id}-video-${index}`,
                  url: video,
                  type: 'video',
                  category: 'post',
                  createdAt: post.createdAt,
                  postId: post.id,
                  postContent: post.content,
                  fileExtension: extension
                });
                processedUrls.add(video);
              }
            });
          }

          if (post.documents && Array.isArray(post.documents) && post.documents.length > 0) {
            post.documents.forEach((doc, index) => {
              if (doc && typeof doc === 'object' && doc.url && typeof doc.url === 'string' && !processedUrls.has(doc.url)) {
                const extension = getFileExtension(doc.url);
                allItems.push({
                  id: `${post.id}-doc-${index}`,
                  url: doc.url,
                  type: 'document',
                  category: 'post',
                  createdAt: post.createdAt,
                  postId: post.id,
                  postContent: post.content,
                  fileExtension: extension,
                  size: doc.size
                });
                processedUrls.add(doc.url);
              }
            });
          }
        } catch (postError) {
          console.warn(`Error processing post ${post.id}:`, postError);
        }
      });

      try {
        const personalImages = await getPersonalImages(userId);
        if (Array.isArray(personalImages)) {
          personalImages.forEach(img => {
            try {
              if (img && img.imageUrl && typeof img.imageUrl === 'string') {
                const extension = getFileExtension(img.imageUrl);
                allItems.push({
                  id: `personal-${img.id}`,
                  url: img.imageUrl,
                  type: isVideoFile(extension) ? 'video' : isDocumentFile(extension) ? 'document' : 'image',
                  category: 'personal',
                  createdAt: img.createdAt ?? new Date().toISOString(),
                  description: img.description ?? undefined,
                  fileExtension: extension
                });
              }
            } catch (imgError) {
              console.warn(`Error processing personal image ${img.id}:`, imgError);
            }
          });
        }
      } catch (personalError) {
        console.warn('Could not load personal images:', personalError);
      }

      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setMediaItems(allItems);
      
      const images = allItems.filter(item => item.type === 'image');
      const videos = allItems.filter(item => item.type === 'video');
      const documents = allItems.filter(item => item.type === 'document');
      
      setStats({
        total: allItems.length,
        images: images.length,
        videos: videos.length,
        documents: documents.length,
        totalSize: allItems.reduce((sum, item) => sum + (item.size || 0), 0)
      });
      
    } catch (error) {
      console.error('Error loading media items:', error);
      setError('Không thể tải dữ liệu media');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = (): MediaItem[] => {
    let filtered = mediaItems;

    if (mediaFilter !== 'all') {
      filtered = filtered.filter(item => {
        switch (mediaFilter) {
          case 'images':
            return item.type === 'image';
          case 'videos':
            return item.type === 'video';
          case 'documents':
            return item.type === 'document';
          default:
            return true;
        }
      });
    }

    filtered = filterByDate(filtered, dateFilter);

    filtered = filterBySize(filtered, sizeFilter);

    return filtered;
  };

  useEffect(() => {
    if (mediaFilter === 'documents' && viewMode !== 'card') {
      setViewMode('card');
    }
  }, [mediaFilter, viewMode]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'avatar':
        return '👤';
      case 'cover':
        return '🖼️';
      case 'personal':
        return '📷';
      case 'post':
        return '📝';
      default:
        return '📁';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadMediaItems}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Kho lưu trữ Media</h2>
            <p className="text-gray-500">{filteredItems.length} mục được hiển thị</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Tổng: {stats.total} mục • {formatFileSize(stats.totalSize)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.images}</div>
            <div className="text-sm text-blue-500">Ảnh</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.videos}</div>
            <div className="text-sm text-red-500">Video</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.documents}</div>
            <div className="text-sm text-green-500">Tài liệu</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
            <div className="text-sm text-purple-500">Tổng cộng</div>
          </div>
        </div>


        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại media</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tất cả', icon: '📁' },
                { value: 'images', label: 'Ảnh', icon: '🖼️' },
                { value: 'videos', label: 'Video', icon: '🎥' },
                { value: 'documents', label: 'Tài liệu', icon: '📄' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setMediaFilter(filter.value as MediaFilter)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mediaFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'today', label: 'Hôm nay' },
                { value: 'week', label: 'Tuần này' },
                { value: 'month', label: 'Tháng này' },
                { value: 'year', label: 'Năm này' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value as DateFilter)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === filter.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kích thước</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'small', label: '< 1MB' },
                { value: 'medium', label: '1-10MB' },
                { value: 'large', label: '> 10MB' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setSizeFilter(filter.value as SizeFilter)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sizeFilter === filter.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            {mediaFilter === 'documents' ? (
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🃏 Thẻ
              </button>
            ) : (
              <>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔲 Lưới
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Timeline
                </button>
                <button
                  onClick={() => setViewMode('album')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'album'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📚 Album
                </button>
                <button
                  onClick={() => setViewMode('carousel')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'carousel'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🎠 Carousel
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'masonry'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🧱 Masonry
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 Danh sách
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'card'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🃏 Thẻ
                </button>
              </>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <p className="text-gray-600 text-lg">Không có media nào</p>
            <p className="text-gray-500 text-sm">Thử thay đổi bộ lọc để xem thêm</p>
          </div>
        ) : (
          <>
            {viewMode === 'album' ? (
              <MediaAlbum 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
              />
            ) : viewMode === 'carousel' ? (
              <MediaCarousel 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
              />
            ) : viewMode === 'masonry' ? (
              <MediaMasonry 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
              />
            ) : viewMode === 'list' ? (
              <MediaList 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
              />
            ) : viewMode === 'card' ? (
              <MediaCard 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
              />
            ) : (
              <MediaTimeline 
                items={filteredItems} 
                onItemClick={(item) => {
                  if (item.type === 'video') {
                    setSelectedVideo(item.url);
                  } else {
                    setSelectedItem(item);
                  }
                }}
                viewMode={viewMode}
              />
            )}
          </>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getTypeIcon(selectedItem.type)}</span>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedItem.type === 'image' ? 'Ảnh' : selectedItem.type === 'video' ? 'Video' : 'Tài liệu'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getCategoryIcon(selectedItem.category)} {selectedItem.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              {selectedItem.type === 'image' ? (
                <img
                  src={getImageUrl(selectedItem.url)}
                  alt="Media"
                  className="w-full max-h-96 object-contain rounded-lg mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">
                    {selectedItem.type === 'video' ? '🎥' : '📄'}
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {selectedItem.type === 'video' ? 'Video' : 'Tài liệu'}
                  </p>
                  <p className="text-gray-500 mb-4">
                    {selectedItem.fileExtension?.toUpperCase()} • {selectedItem.size ? formatFileSize(selectedItem.size) : 'Không xác định'}
                  </p>
                  <a
                    href={getImageUrl(selectedItem.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Tải xuống
                  </a>
                </div>
              )}
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatTimeAgo(selectedItem.createdAt)}</span>
                  {selectedItem.size && (
                    <span>{formatFileSize(selectedItem.size)}</span>
                  )}
                </div>
                
                {selectedItem.postContent && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-800 text-sm">{selectedItem.postContent}</p>
                  </div>
                )}
                
                {selectedItem.description && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">{selectedItem.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo}
          title="Xem video"
        />
      )}
    </>
  );
}
