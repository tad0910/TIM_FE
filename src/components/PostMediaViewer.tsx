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
      <div className="flex-1 bg-gray-100 flex items-center justify-center min-h-[50vh] lg:min-h-screen">
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
    <div className="flex-1 bg-black relative flex items-center justify-center min-h-[50vh] lg:min-h-screen">
      <button
        onClick={onClose}
        className="absolute top-2 left-2 lg:top-4 lg:left-4 z-10 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
        aria-label="Đóng"
      >
        <FontAwesomeIcon icon={['fas', 'xmark']} className="text-lg lg:text-xl" />
      </button>

      {hasMultipleMedia && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 lg:left-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-50 text-white p-2 lg:p-3 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Ảnh trước"
          >
            <FontAwesomeIcon icon={['fas', 'chevron-left']} className="text-lg lg:text-xl" />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-2 lg:right-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-50 text-white p-2 lg:p-3 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Ảnh tiếp"
          >
            <FontAwesomeIcon icon={['fas', 'chevron-right']} className="text-lg lg:text-xl" />
          </button>
        </>
      )}

      <button
        onClick={handleZoomClick}
        className="absolute top-2 right-2 lg:top-4 lg:right-4 z-10 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
        aria-label="Phóng to"
      >
        <FontAwesomeIcon icon={['fas', 'magnifying-glass-plus']} className="text-lg lg:text-xl" />
      </button>

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
        <div className="absolute bottom-2 lg:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 lg:space-x-2">
          {allMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all ${
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
