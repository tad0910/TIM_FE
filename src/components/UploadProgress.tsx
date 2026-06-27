interface UploadProgressProps {
  progress: number;
  fileName: string;
  isUploading: boolean;
}

export default function UploadProgress({ progress, fileName, isUploading }: UploadProgressProps) {
  if (!isUploading) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">
          Đang tải lên: {fileName}
        </span>
        <span className="text-sm text-blue-600">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
