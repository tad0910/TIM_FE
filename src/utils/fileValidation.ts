export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}

export function validateFiles(
  files: FileList | File[],
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSize = 10,
    allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ],
    maxFiles = 10
  } = options;

  const errors: string[] = [];
  const fileArray = Array.from(files);
  const maxSizeBytes = maxSize * 1024 * 1024;

  if (fileArray.length > maxFiles) {
    errors.push(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
  }

  fileArray.forEach((file) => {
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File ${file.name} không được hỗ trợ. Chỉ chấp nhận ảnh, video và document (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR, 7Z).`);
    }

    if (file.size > maxSizeBytes) {
      errors.push(`File ${file.name} quá lớn. Kích thước tối đa là ${maxSize}MB.`);
    }

    if (file.size === 0) {
      errors.push(`File ${file.name} trống.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isDocumentFile(file: File): boolean {
  return file.type.startsWith('application/') || file.type.startsWith('text/');
}

export function getFileIcon(file: File): string {
  if (isImageFile(file)) return '🖼️';
  if (isVideoFile(file)) return '🎥';
  if (isDocumentFile(file)) {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return '📊';
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return '📈';
    if (file.type === 'text/plain') return '📄';
    if (file.type === 'text/csv') return '📊';
    if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z')) return '📦';
    return '📄';
  }
  return '📄';
}
