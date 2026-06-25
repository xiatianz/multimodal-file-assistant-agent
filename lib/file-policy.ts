export type UploadFileKind = 'pdf' | 'image' | 'word' | 'excel' | 'csv' | 'text';

export const MAX_FILES_PER_REQUEST = 8;
export const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_UPLOAD_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8192;
export const MAX_IMAGE_PIXELS = 25 * 1024 * 1024;

export const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
]);

export const SUPPORTED_TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'xml',
  'html',
  'log',
  'yml',
  'yaml',
  'css',
  'js',
  'ts',
  'tsx',
  'py',
  'sql',
]);

export const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  ...Array.from(SUPPORTED_IMAGE_EXTENSIONS),
  ...Array.from(SUPPORTED_TEXT_EXTENSIONS),
]);

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function isImageFileName(fileName: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

export function getUploadFileKind(fileName: string): UploadFileKind {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'pdf';
  if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (ext === 'doc' || ext === 'docx') return 'word';
  if (ext === 'xls' || ext === 'xlsx') return 'excel';
  if (ext === 'csv') return 'csv';
  return 'text';
}

export function isSupportedUploadFileName(fileName: string): boolean {
  return SUPPORTED_UPLOAD_EXTENSIONS.has(getFileExtension(fileName));
}

export function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

export function estimateBase64Bytes(base64: string): number {
  const clean = base64.replace(/\s+/g, '');
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}
