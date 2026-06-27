import { resolveMediaUrl } from "../utils/mediaUrl";

interface FacebookGridProps {
  images: string[];
  className?: string;
}

export default function FacebookGrid({ images, className = '' }: FacebookGridProps) {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, 5); 
  const remainingCount = images.length - 5;

  const getFacebookLayout = (count: number) => {
    switch (count) {
      case 1:
        return "w-full max-h-[500px] rounded-lg overflow-hidden";
      case 2:
        return "w-full max-h-[400px] rounded-lg overflow-hidden grid grid-cols-2 gap-0.5";
      case 3:
        return "w-full max-h-[400px] rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5";
      case 4:
        return "w-full max-h-[400px] rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5";
      default:
        return "w-full max-h-[400px] rounded-lg overflow-hidden grid grid-cols-3 grid-rows-2 gap-0.5";
    }
  };

  const getImageClasses = (index: number, count: number) => {
    let baseClasses = "w-full h-full object-cover block";
    
    if (count === 3 && index === 0) {
      baseClasses += " row-span-2";
    }
    
    if (count >= 5 && index === 3) {
      baseClasses += " col-span-2";
    }
    
    if (count >= 5 && index === 4) {
      baseClasses += " relative";
    }
    
    return baseClasses;
  };

  const containerClass = getFacebookLayout(images.length);

  return (
    <div className={`${containerClass} ${className}`}>
      {displayImages.map((image, index) => (
        <div key={index} className="relative">
          <img
            src={resolveMediaUrl(image) || image}
            alt={`Post image ${index + 1}`}
            className={getImageClasses(index, images.length)}
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
