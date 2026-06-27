import { useState } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import VideoModal from './VideoModal';

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

interface MediaAlbumProps {
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

export default function MediaAlbum({ items, onItemClick }: MediaAlbumProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const groupedByCategory = items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
    return groups;
  }, {} as Record<string, MediaItem[]>);

  const categories = Object.keys(groupedByCategory).sort((a, b) => {
    const order = ['avatar', 'cover', 'personal', 'post'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <>
      <div className="space-y-8">
      {categories.map((category) => (
        <div key={category} className="space-y-4">
          {/* Category Header */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">{getCategoryIcon(category)}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {category === 'avatar' ? 'Ảnh đại diện' : 
                 category === 'cover' ? 'Ảnh bìa' :
                 category === 'personal' ? 'Ảnh cá nhân' : 'Ảnh trong bài viết'}
              </h3>
              <p className="text-sm text-gray-500">
                {groupedByCategory[category].length} mục
              </p>
            </div>
          </div>

          {/* Media Grid for this category */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {groupedByCategory[category].map((item) => (
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

                {/* Type Badge */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {getTypeIcon(item.type)}
                </div>

                {/* Post content preview */}
                {item.postContent && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="truncate">{item.postContent}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show more button if there are many items */}
          {groupedByCategory[category].length > 12 && (
            <div className="text-center">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Xem thêm {groupedByCategory[category].length - 12} mục
              </button>
            </div>
          )}
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
