interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

const VideoModal = ({ isOpen, onClose, videoUrl, title }: VideoModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || 'Xem video'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="p-4">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <video
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              controls
              autoPlay
              preload="metadata"
              onError={(e) => {
                console.error("VideoModal video error:", videoUrl, e);
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Click vào video để phát/tạm dừng
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(videoUrl, '_blank')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mở trong tab mới
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
