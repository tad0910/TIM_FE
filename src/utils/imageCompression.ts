export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSize?: number;
}

export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSize = 5
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const compressedSizeMB = blob.size / (1024 * 1024);
          if (compressedSizeMB > maxSize) {
            const newQuality = Math.max(0.1, quality * 0.7);
            canvas.toBlob(
              (newBlob) => {
                if (!newBlob) {
                  reject(new Error('Compression failed'));
                  return;
                }
                const compressedFile = new File([newBlob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              },
              file.type,
              newQuality
            );
          } else {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressedFiles: File[] = [];
  
  for (const file of files) {
    try {
      const compressedFile = await compressImage(file, options);
      compressedFiles.push(compressedFile);
    } catch (error) {
      console.error('Failed to compress file:', file.name, error);
      compressedFiles.push(file);
    }
  }
  
  return compressedFiles;
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}
