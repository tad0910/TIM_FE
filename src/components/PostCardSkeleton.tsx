export default function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
      <div className="bg-gray-100 p-1">
        <div className="h-48 bg-gray-200 animate-pulse"></div>
      </div>
      <div className="p-4 flex justify-between text-sm">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </div>
    </div>
  );
}
