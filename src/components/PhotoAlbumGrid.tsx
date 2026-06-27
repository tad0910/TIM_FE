import PhotoAlbum from "react-photo-album";
import { resolveMediaUrl } from "../utils/mediaUrl";
import type { LayoutType } from 'react-photo-album';

interface PhotoAlbumGridProps {
  images: string[];
  className?: string;
}

const chooseLayout = (count: number): LayoutType => {
  console.log('chooseLayout called with count:', count);
  
  switch (count) {
    case 1:
      return "rows"; 
    case 2:
      return "columns"; 
    case 3:
      return "rows"; 
    case 4:
      return "masonry"; 
    default:
      return "masonry"; 
  }
};

export default function PhotoAlbumGrid({ images, className = '' }: PhotoAlbumGridProps) {
  if (!images || images.length === 0) return null;

  const photos = images.map((image, index) => ({
    src: resolveMediaUrl(image) || image,
    width: 800,
    height: 600,
    alt: `Post image ${index + 1}`,
  }));

  const layout = chooseLayout(images.length);
  
  console.log('PhotoAlbumGrid Debug:', {
    imageCount: images.length,
    layout: layout,
    photos: photos.length
  });

  return (
    <div className={`photo-album-container ${className}`}>
      <PhotoAlbum
        photos={photos}
        layout={layout}
        targetRowHeight={200}
        spacing={2}
        padding={0}
      />
    </div>
  );
}
