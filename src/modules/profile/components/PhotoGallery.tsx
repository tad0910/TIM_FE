import { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { getPostsByUser } from '../../../services/postApi';

interface PhotoGalleryProps {
  userId: string;
}

interface Photo {
  id: string;
  url: string;
  postId: string;
  postContent: string;
  createdAt: string;
  type: 'post' | 'cover' | 'avatar';
}

export default function PhotoGallery({ userId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const posts = await getPostsByUser(userId);
      const allPhotos: Photo[] = [];

      posts.forEach(post => {
        if (post.image) {
          allPhotos.push({
            id: `${post.id}-single`,
            url: post.image,
            postId: post.id,
            postContent: post.content,
            createdAt: post.createdAt,
            type: 'post'
          });
        }

        if (post.images && post.images.length > 0) {
          post.images.forEach((image, index) => {
            allPhotos.push({
              id: `${post.id}-${index}`,
              url: image,
              postId: post.id,
              postContent: post.content,
              createdAt: post.createdAt,
              type: 'post'
            });
          });
        }
      });

      allPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      setError('Không thể tải ảnh');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
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
          onClick={loadPhotos}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-gray-400 text-6xl mb-4">📸</div>
        <p className="text-gray-600 text-lg">Chưa có ảnh nào</p>
        <p className="text-gray-500 text-sm">Hãy đăng ảnh đầu tiên của bạn!</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Kho ảnh</h2>
          <span className="text-gray-500">{photos.length} ảnh</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={resolveMediaUrl(photo.url) || photo.url}
                alt="Photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
          
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Ảnh từ bài viết</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <img
                src={resolveMediaUrl(selectedPhoto.url) || selectedPhoto.url}
                alt="Photo"
                className="w-full max-h-96 object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              
              <div className="mt-4 space-y-2">
                <p className="text-gray-600 text-sm">
                  {formatTimeAgo(selectedPhoto.createdAt)}
                </p>
                {selectedPhoto.postContent && (
                  <p className="text-gray-800">{selectedPhoto.postContent}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
