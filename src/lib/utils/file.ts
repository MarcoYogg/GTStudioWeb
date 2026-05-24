const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedImage(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

export function isAllowedReceiptFile(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type);
}

export function isUnderSizeLimit(file: File, limit = MAX_FILE_SIZE): boolean {
  return file.size <= limit;
}

export function getFileType(file: File): 'image' | 'pdf' {
  return file.type === 'application/pdf' ? 'pdf' : 'image';
}

export function validateReceiptFile(file: File): string | null {
  if (!isAllowedReceiptFile(file)) return '只接受 JPG、PNG 或 PDF 格式';
  if (!isUnderSizeLimit(file)) return '檔案大小不得超過 10MB';
  return null;
}