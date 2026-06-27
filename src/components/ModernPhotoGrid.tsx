import { resolveMediaUrl } from "../utils/mediaUrl";

interface ModernPhotoGridProps {
  images: string[];
  className?: string;
}

export default function ModernPhotoGrid({ images, className = '' }: ModernPhotoGridProps) {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  const getGridLayout = (count: number) => {
    switch (count) {
      case 1:
        return "grid-cols-1 max-h-[500px]";
      case 2:
        return "grid-cols-2 max-h-[400px]";
      case 3:
        return "grid-cols-2 grid-rows-2 max-h-[400px]";
      case 4:
        return "grid-cols-2 grid-rows-2 max-h-[400px]";
      default:
        return "grid-cols-3 grid-rows-2 max-h-[400px]";
    }
  };

  const getImageSpan = (index: number, count: number) => {
    if (count === 3 && index === 0) return "row-span-2";
    if (count >= 5 && index === 3) return "col-span-2";
    return "";
  };

  return (
    <div className={`grid gap-1 ${getGridLayout(images.length)} ${className} overflow-hidden`}>
      {displayImages.map((image, index) => (
        <div
          key={index}
          className={`relative overflow-hidden rounded-none ${getImageSpan(index, images.length)}`}
        >
          <img
            src={resolveMediaUrl(image) || image}
            alt={`Post image ${index + 1}`}
            className="w-full h-full object-contain rounded-none"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          
          {index === 4 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
