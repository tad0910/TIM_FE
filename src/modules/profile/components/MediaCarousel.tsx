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

interface MediaCarouselProps {
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

export default function MediaCarousel({ items, onItemClick }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📁</div>
        <p className="text-gray-600 text-lg">Không có media nào</p>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="space-y-4">
      {/* Main Carousel */}
      <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Main Content */}
        <div className="aspect-video bg-gray-100">
          {currentItem.type === 'image' ? (
            <img
              src={getImageUrl(currentItem.url)}
              alt="Media"
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => {
              if (currentItem.type === 'video') {
                setSelectedVideo(currentItem.url);
              } else {
                onItemClick(currentItem);
              }
            }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : currentItem.type === 'video' ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 cursor-pointer" onClick={() => onItemClick(currentItem)}>
              <div className="text-center">
                <div className="text-6xl mb-4">🎥</div>
                <div className="text-lg text-gray-600">{currentItem.fileExtension?.toUpperCase()}</div>
                <div className="text-sm text-gray-500 mt-2">Click để xem</div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 cursor-pointer" onClick={() => onItemClick(currentItem)}>
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <div className="text-lg text-gray-600">{currentItem.fileExtension?.toUpperCase()}</div>
                <div className="text-sm text-gray-500 mt-2">Click để tải xuống</div>
              </div>
            </div>
          )}
        </div>

        {/* Media Info */}
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getTypeIcon(currentItem.type)}</span>
              <span className="font-medium">
                {currentItem.type === 'image' ? 'Ảnh' : currentItem.type === 'video' ? 'Video' : 'Tài liệu'}
              </span>
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {getCategoryIcon(currentItem.category)} {currentItem.category}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {items.length}
            </span>
          </div>

          {currentItem.postContent && (
            <p className="text-gray-700 text-sm mb-2 line-clamp-2">{currentItem.postContent}</p>
          )}

          {currentItem.description && (
            <p className="text-blue-600 text-sm mb-2">{currentItem.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{parseBackendDate(currentItem.createdAt)?.toLocaleDateString('vi-VN') || '—'}</span>
            {currentItem.size && (
              <span>{(currentItem.size / (1024 * 1024)).toFixed(2)} MB</span>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {items.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all ${
                index === currentIndex
                  ? 'ring-2 ring-blue-500 scale-105'
                  : 'hover:scale-105'
              }`}
              onClick={() => goToSlide(index)}
            >
              {item.type === 'image' ? (
                <img
                  src={getImageUrl(item.url)}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg">
                    {item.type === 'video' ? '🎥' : '📄'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dots Navigation */}
      {items.length > 1 && (
        <div className="flex justify-center space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

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
