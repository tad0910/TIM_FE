import { resolveMediaUrl } from "../utils/mediaUrl";

interface ModernPhotoGridProps {
  images: string[];
  className?: string;
  onRemove?: (index: number) => void;
}

export default function ModernPhotoGrid({ images, className = '', onRemove }: ModernPhotoGridProps) {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  const getGridLayout = (count: number) => {
    switch (count) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2 aspect-square sm:aspect-[4/3]";
      case 3:
        return "grid-cols-2 grid-rows-2 aspect-square sm:aspect-[4/3]";
      case 4:
        return "grid-cols-3 grid-rows-2 aspect-square sm:aspect-[4/3]";
      default:
        return "grid-cols-6 grid-rows-2 aspect-square sm:aspect-[4/3]";
    }
  };

  const getImageSpan = (index: number, count: number) => {
    if (count === 3 && index === 0) return "row-span-2";
    if (count === 4 && index === 0) return "col-span-3";
    if (count >= 5) {
      if (index < 2) return "col-span-3";
      return "col-span-2";
    }
    return "";
  };

  return (
    <div className={`grid gap-0.5 ${getGridLayout(images.length)} ${className} overflow-hidden w-full bg-white`}>
      {displayImages.map((image, index) => (
        <div
          key={index}
          className={`relative overflow-hidden ${getImageSpan(index, images.length)} group`}
        >
          <img
            src={resolveMediaUrl(image) || image}
            alt={`Post image ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          
          {index === 4 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">
                +{remainingCount}
              </span>
            </div>
          )}
          
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 transition-colors border border-gray-200 opacity-0 group-hover:opacity-100 z-10"
              title="Xóa ảnh"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
