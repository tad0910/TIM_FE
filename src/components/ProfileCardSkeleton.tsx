export default function ProfileCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-0">
      {/* Compact header - matches UserProfileCard h-32 */}
      <div className="w-full h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-t-2xl animate-pulse"></div>

      {/* Profile Picture */}
      <div className="px-6">
        <div className="relative -mt-20 md:-mt-24 lg:-mt-28 inline-block">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto border-4 border-white shadow-md animate-pulse"></div>
        </div>
      </div>

      {/* User Info */}
      <div className="text-center mt-2 mb-6 px-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-6 px-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2 text-sm pb-6 animate-pulse">
        <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}
