
interface MediaStatsCardProps {
  stats: {
    total: number;
    images: number;
    videos: number;
    documents: number;
    totalSize: number;
  };
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MediaStatsCard({ stats }: MediaStatsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê Media</h3>
      
      <div className="space-y-4">
        {/* Total Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng số file</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="text-3xl">📁</div>
          </div>
        </div>

        {/* Breakdown by Type */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.images}</div>
            <div className="text-xs text-blue-500">Ảnh</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.videos}</div>
            <div className="text-xs text-red-500">Video</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.documents}</div>
            <div className="text-xs text-green-500">Tài liệu</div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Dung lượng sử dụng</span>
            <span className="text-sm font-medium text-gray-900">
              {formatFileSize(stats.totalSize)}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((stats.totalSize / (100 * 1024 * 1024)) * 100, 100)}%` 
              }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 MB</span>
            <span>100 MB</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            📤 Xuất tất cả
          </button>
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            🗑️ Dọn dẹp
          </button>
        </div>
      </div>
    </div>
  );
}
