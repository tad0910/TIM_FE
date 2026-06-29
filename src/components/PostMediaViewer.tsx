import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontawesome';
import type { Post } from '../types/post';

interface PostMediaViewerProps {
  post: Post;
  onClose: () => void;
}

export default function PostMediaViewer({ post, onClose }: PostMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  
  const images = post.images || (post.image ? [post.image] : []);
  const videos = post.videos || (post.video ? [post.video] : []);
  const allMedia = [...images, ...videos];
  
  const hasMultipleMedia = allMedia.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allMedia.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < allMedia.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showZoomModal) {
        setShowZoomModal(false);
      } else {
        onClose();
      }
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  const handleZoomClick = () => {
    setShowZoomModal(true);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (allMedia.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FontAwesomeIcon icon={['fas', 'image']} className="text-4xl lg:text-6xl mb-4" />
          <p className="text-sm lg:text-base">Không có hình ảnh hoặc video</p>
        </div>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];
  const isVideo = videos.includes(currentMedia);

  return (
    <>
    <div className="w-full h-full bg-black relative flex items-center justify-center">
      {/* Top Left Header (Close + Logo) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="Đóng"
        >
          <FontAwesomeIcon icon={['fas', 'xmark']} className="text-xl" />
        </button>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
          <FontAwesomeIcon icon={['fas', 'layer-group']} className="text-white text-lg" />
        </div>
      </div>

      {hasMultipleMedia && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="Ảnh trước"
          >
            <FontAwesomeIcon icon={['fas', 'chevron-left']} className="text-xl" />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="Ảnh tiếp"
          >
            <FontAwesomeIcon icon={['fas', 'chevron-right']} className="text-xl" />
          </button>
        </>
      )}

      {/* Top Right Header (Zoom) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <button
          onClick={handleZoomClick}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="Phóng to"
        >
          <FontAwesomeIcon icon={['fas', 'magnifying-glass-plus']} className="text-lg" />
        </button>
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }
          }}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors hidden sm:flex"
          aria-label="Toàn màn hình"
        >
          <FontAwesomeIcon icon={['fas', 'expand']} className="text-lg" />
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center p-0 overflow-hidden">
        {isVideo ? (
          <video
            src={currentMedia}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          >
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        ) : (
          <img
            src={currentMedia}
            alt={`Media ${currentIndex + 1}`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}
      </div>

      {hasMultipleMedia && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {allMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-blue-500 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.8)]' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Chuyển đến media ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>

    {showZoomModal && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <button
          onClick={() => setShowZoomModal(false)}
          className="absolute top-4 right-4 z-10 bg-gray-800 bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
          aria-label="Đóng"
        >
          <FontAwesomeIcon icon={['fas', 'xmark']} className="text-2xl" />
        </button>

        {hasMultipleMedia && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Ảnh trước"
            >
              <FontAwesomeIcon icon={['fas', 'chevron-left']} className="text-2xl" />
            </button>
            
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Ảnh tiếp"
            >
              <FontAwesomeIcon icon={['fas', 'chevron-right']} className="text-2xl" />
            </button>
          </>
        )}

        {hasMultipleMedia && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-gray-800 bg-opacity-50 text-white px-4 py-2 rounded-full text-lg">
            {currentIndex + 1} / {allMedia.length}
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center p-4">
          {isVideo ? (
            <video
              src={currentMedia}
              controls
              className="w-full h-auto object-contain max-w-[1300px]"
              preload="metadata"
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          ) : (
            <img
              src={currentMedia}
              alt={`Media ${currentIndex + 1}`}
              className="w-full h-auto object-contain max-w-[1300px]"
              loading="lazy"
            />
          )}
        </div>

        {hasMultipleMedia && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {allMedia.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white' 
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Chuyển đến media ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    )}
    </>
  );
}
