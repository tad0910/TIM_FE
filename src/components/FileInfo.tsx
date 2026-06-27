import { formatFileSize, getFileExtension } from '../utils/fileValidation';

interface FileInfoProps {
  file: File;
  className?: string;
}

export default function FileInfo({ file, className = '' }: FileInfoProps) {
  const extension = getFileExtension(file.name);
  const size = formatFileSize(file.size);
  
  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium">{file.name}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="px-2 py-1 bg-gray-100 rounded">{extension.toUpperCase()}</span>
        <span>{size}</span>
      </div>
    </div>
  );
}
