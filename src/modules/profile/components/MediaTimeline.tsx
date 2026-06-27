
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

interface MediaTimelineProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  viewMode?: 'grid' | 'timeline';
}

const formatTimeAgo = (dateString: string | number[] | null | undefined): string => {
  const date = parseBackendDate(dateString);
  if (!date) return "Vừa xong";
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

export default function MediaTimeline({ items, onItemClick, viewMode = 'grid' }: MediaTimelineProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const groupedItems = items.reduce((groups, item) => {
    const date = new Date(item.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, MediaItem[]>);

  const sortedDates = Object.keys(groupedItems).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (viewMode === 'grid') {
    return (
      <>
        <div className="space-y-4">
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group bg-gray-100"
                  onClick={() => {
                    if (item.type === 'video') {
                      setSelectedVideo(item.url);
                    } else {
                      onItemClick(item);
                    }
                  }}
            >
              {item.type === 'image' ? (
                <img
                  src={getImageUrl(item.url)}
                  alt="Media"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : item.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎥</div>
                    <div className="text-xs text-gray-600">{item.fileExtension?.toUpperCase()}</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📄</div>
                    <div className="text-xs text-gray-600">{item.fileExtension?.toUpperCase()}</div>
                  </div>
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {getCategoryIcon(item.category)} {item.category}
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {getTypeIcon(item.type)}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">

      {sortedDates.map((date) => (
        <div key={date} className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 className="text-lg font-medium text-gray-900">
              {parseBackendDate(date)?.toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h4>
            <span className="text-sm text-gray-500">
              ({groupedItems[date].length} mục)
            </span>
          </div>

          <div className="ml-6 space-y-3">
            {groupedItems[date].map((item) => (
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
                    <span className="text-sm font-medium text-gray-900">
                      {getTypeIcon(item.type)} {item.type === 'image' ? 'Ảnh' : item.type === 'video' ? 'Video' : 'Tài liệu'}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {getCategoryIcon(item.category)} {item.category}
                    </span>
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
                  
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(item.createdAt)}
                  </p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Video Modal */}
    {selectedVideo && (
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo || ''}
        title="Xem video"
      />
    )}
    </>
  );
}
