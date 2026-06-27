import { useState } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import VideoModal from './VideoModal';
// import { parseBackendDate } from '../../../utils/timeFormat';

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

interface MediaMasonryProps {
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

export default function MediaMasonry({ items, onItemClick }: MediaMasonryProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const columns = 3;
  const columnItems: MediaItem[][] = Array.from({ length: columns }, () => []);

  items.forEach((item, index) => {
    columnItems[index % columns].push(item);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columnItems.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-4">
            {column.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-lg cursor-pointer group bg-gray-100"
                  onClick={() => {
                    if (item.type === 'video') {
                      setSelectedVideo(item.url);
                    } else {
                      onItemClick(item);
                    }
                  }}
              >
                {item.type === 'image' ? (
                  <div className="relative">
                    <img
                      src={getImageUrl(item.url)}
                      alt="Media"
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      style={{ height: 'auto' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    {/* Post content preview */}
                    {item.postContent && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-sm line-clamp-2">{item.postContent}</p>
                      </div>
                    )}
                  </div>
                ) : item.type === 'video' ? (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎥</div>
                      <div className="text-sm text-gray-600">{item.fileExtension?.toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">Click để xem</div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-sm text-gray-600">{item.fileExtension?.toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">Click để tải xuống</div>
                    </div>
                  </div>
                )}

                {/* Item Info */}
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {getTypeIcon(item.type)} {item.type === 'image' ? 'Ảnh' : item.type === 'video' ? 'Video' : 'Tài liệu'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {parseBackendDate(item.createdAt)?.toLocaleDateString('vi-VN') || '—'}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs text-blue-600 truncate">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

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
