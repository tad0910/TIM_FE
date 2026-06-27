import PostCardSkeleton from "./PostCardSkeleton";

export default function PostsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Posts skeleton */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
