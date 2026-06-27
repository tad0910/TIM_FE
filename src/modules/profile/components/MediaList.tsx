import { useState } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import VideoModal from './VideoModal';
import { parseBackendDate } from '../../../utils/timeFormat';

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

interface MediaListProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

const getImageUrl = (url: string): string => {
  return resolveMediaUrl(url) || url;
};

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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

export default function MediaList({ items, onItemClick }: MediaListProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center space-x-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            if (item.type === 'video') {
              setSelectedVideo(item.url);
            } else {
              onItemClick(item);
            }
          }}
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {item.type === 'image' ? (
              <img
                src={getImageUrl(item.url)}
                alt="Media"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">
                  {item.type === 'video' ? '🎥' : '📄'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg">{getTypeIcon(item.type)}</span>
              <span className="font-medium text-gray-900">
                {item.type === 'image' ? 'Ảnh' : item.type === 'video' ? 'Video' : 'Tài liệu'}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {getCategoryIcon(item.category)} {item.category}
              </span>
              {item.fileExtension && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {item.fileExtension.toUpperCase()}
                </span>
              )}
            </div>
            
            {item.postContent && (
              <p className="text-sm text-gray-600 truncate mb-1">
                {item.postContent}
              </p>
            )}
            
            {item.description && (
              <p className="text-sm text-blue-600 truncate mb-1">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{formatTimeAgo(item.createdAt)}</span>
              {item.size && (
                <span>{formatFileSize(item.size)}</span>
              )}
              <span>{parseBackendDate(item.createdAt)?.toLocaleDateString('vi-VN') || '—'}</span>
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo}
          title="Xem video"
        />
      )}
    </div>
  );
}
