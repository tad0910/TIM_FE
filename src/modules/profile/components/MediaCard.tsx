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

interface MediaCardProps {
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

const getDocumentIcon = (extension: string) => {
  switch (extension?.toLowerCase()) {
    case 'pdf':
      return '📕';
    case 'doc':
    case 'docx':
      return '📘';
    case 'txt':
      return '📝';
    case 'ppt':
    case 'pptx':
      return '📊';
    case 'xls':
    case 'xlsx':
      return '📈';
    default:
      return '📄';
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

export default function MediaCard({ items, onItemClick }: MediaCardProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => {
            if (item.type === 'video') {
              setSelectedVideo(item.url);
            } else {
              onItemClick(item);
            }
          }}
        >
          {/* Media Preview */}
          <div className="aspect-video bg-gray-100">
            {item.type === 'image' ? (
              <img
                src={getImageUrl(item.url)}
                alt="Media"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : item.type === 'video' ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <div className="text-5xl mb-3">🎥</div>
                  <div className="text-sm text-gray-600">{item.fileExtension?.toUpperCase()}</div>
                  <div className="text-xs text-gray-500 mt-1">Click để xem</div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                <div className="text-center">
                  <div className="text-5xl mb-3">{getDocumentIcon(item.fileExtension || '')}</div>
                  <div className="text-sm font-semibold text-gray-700">{item.fileExtension?.toUpperCase()}</div>
                  <div className="text-xs text-gray-500 mt-1">Tài liệu</div>
                </div>
              </div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {item.type === 'document' ? getDocumentIcon(item.fileExtension || '') : getTypeIcon(item.type)}
                </span>
                <span className="font-semibold text-gray-900">
                  {item.type === 'image' ? 'Ảnh' : item.type === 'video' ? 'Video' : 'Tài liệu'}
                </span>
                {item.fileExtension && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.type === 'document' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {item.fileExtension.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {getCategoryIcon(item.category)} {item.category}
              </span>
            </div>

            {/* Content */}
            {item.postContent && (
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.postContent}</p>
            )}
            
            {item.description && (
              <p className="text-sm text-blue-600 mb-3 line-clamp-1">{item.description}</p>
            )}

            {/* Metadata */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatTimeAgo(item.createdAt)}</span>
                {item.size && (
                  <span>{formatFileSize(item.size)}</span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{parseBackendDate(item.createdAt)?.toLocaleDateString('vi-VN') || '—'}</span>
                {item.type === 'document' && item.fileExtension && (
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded font-medium">
                    {item.fileExtension.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button className={`w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium ${
                item.type === 'document' 
                  ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}>
                {item.type === 'image' ? 'Xem ảnh' : item.type === 'video' ? 'Xem video' : 'Tải xuống'}
              </button>
            </div>
          </div>
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
    </>
  );
}
