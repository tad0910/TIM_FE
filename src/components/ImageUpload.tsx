import { useState, useRef, useCallback } from 'react';
import { validateFiles } from '../utils/fileValidation';

interface ImageUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export default function ImageUpload({ 
  onFilesSelected, 
  maxFiles = 10, 
  maxSize = 10, 
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFilesCallback = useCallback((files: FileList) => {
    const validation = validateFiles(files, {
      maxSize,
      allowedTypes: acceptedTypes,
      maxFiles
    });

    if (!validation.isValid) {
      validation.errors.forEach(error => alert(error));
      return [];
    }

    return Array.from(files);
  }, [maxFiles, maxSize, acceptedTypes]);

  const handleFiles = useCallback((files: FileList) => {
    const validFiles = validateFilesCallback(files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [validateFilesCallback, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center">
        <svg 
          className="w-12 h-12 text-gray-400 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        
        <p className="text-lg font-medium text-gray-700 mb-2">
          Kéo thả ảnh vào đây hoặc click để chọn
        </p>
        
        <p className="text-sm text-gray-500">
          Hỗ trợ: JPG, PNG, GIF, WebP (tối đa {maxSize}MB, {maxFiles} ảnh)
        </p>
      </div>
    </div>
  );
}
