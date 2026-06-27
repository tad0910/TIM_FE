import { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface ImageGridProps {
  images: string[];
  maxDisplay?: number;
  className?: string;
}

export default function ImageGrid({ images, maxDisplay = 5, className = "" }: ImageGridProps) {
  const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number; height: number } }>({});
  
  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  useEffect(() => {
    const loadImageDimensions = async () => {
      const dimensions: { [key: string]: { width: number; height: number } } = {};
      
      for (const image of displayImages) {
        try {
          const img = new Image();
          const resolvedSrc = resolveMediaUrl(image) || image;
          img.onload = () => {
            dimensions[image] = { width: img.naturalWidth, height: img.naturalHeight };
            setImageDimensions(prev => ({ ...prev, ...dimensions }));
          };
          img.src = resolvedSrc;
        } catch (error) {
          console.log('Error loading image dimensions:', error);
        }
      }
    };

    loadImageDimensions();
  }, [displayImages]);

  if (!images || images.length === 0) return null;
  
  const getAspectRatio = (image: string) => {
    const dims = imageDimensions[image];
    if (!dims) return 1; 
    return dims.width / dims.height;
  };

  const isLandscape = (image: string) => {
    const ratio = getAspectRatio(image);
    return ratio > 1.2;
  };
  const isPortrait = (image: string) => {
    const ratio = getAspectRatio(image);
    return ratio < 0.8; 
  };

  const getSmartLayout = () => {
    const count = displayImages.length;
    const landscapeImages = displayImages.filter(img => isLandscape(img));
    const portraitImages = displayImages.filter(img => isPortrait(img));
    const squareImages = displayImages.filter(img => !isLandscape(img) && !isPortrait(img));
    
    console.log('Smart Layout Debug:', {
      count,
      landscape: landscapeImages.length,
      portrait: portraitImages.length,
      square: squareImages.length,
      ratios: displayImages.map(img => getAspectRatio(img).toFixed(2))
    });

    if (count === 1) {
      const image = displayImages[0];
      if (isLandscape(image)) return { grid: "grid-cols-1", height: "max-h-80" };
      if (isPortrait(image)) return { grid: "grid-cols-1", height: "max-h-[600px]" };
      return { grid: "grid-cols-1", height: "max-h-96" };
    }

    if (count === 2) {
      return { grid: "grid-cols-2 grid-rows-1", height: "max-h-80" };
    }

    if (count === 3) {
      return { grid: "grid-cols-2 grid-rows-2", height: "max-h-80" };
    }

    if (count === 4) {
      return { grid: "grid-cols-2 grid-rows-2", height: "max-h-80" };
    }

    if (count >= 5) {
      return { grid: "grid-cols-3", height: "max-h-80" };
    }

    return { grid: "grid-cols-1", height: "max-h-96" };
  };
  
  const getImageClasses = (index: number, total: number) => {
    if (total === 3) {
      if (index === 0) return "row-span-2 col-span-1"; 
      return "row-span-1 col-span-1"; 
    }
    
    if (total >= 5 && index === 4) {
      return "row-span-1 col-span-1 relative";
    }
    
    return "row-span-1 col-span-1";
  };
  
  const layout = getSmartLayout();
  
  return (
    <div className={`grid gap-1 ${layout.grid} ${layout.height} ${className}`}>
      {displayImages.map((image, index) => (
        <div
          key={index}
          className={`relative overflow-hidden ${getImageClasses(index, displayImages.length)}`}
        >
          <img
            src={resolveMediaUrl(image) || image}
            alt={`Post image ${index + 1}`}
            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity bg-gray-100"
            style={{
              aspectRatio: imageDimensions[image] ? 
                `${imageDimensions[image].width} / ${imageDimensions[image].height}` : 
                'auto'
            }}
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
