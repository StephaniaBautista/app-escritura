export const OCR_MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const OCR_MAX_PDF_BYTES = 32 * 1024 * 1024

export const OCR_ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export const OCR_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf'

export type OcrFileError = 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE'

export function maxOcrBytesForMime(mime: string): number {
  return mime === 'application/pdf' ? OCR_MAX_PDF_BYTES : OCR_MAX_IMAGE_BYTES
}

export function validateOcrFile(file: File): OcrFileError | null {
  if (!OCR_ALLOWED_MIMES.has(file.type)) return 'UNSUPPORTED_TYPE'
  if (file.size > maxOcrBytesForMime(file.type)) return 'FILE_TOO_LARGE'
  return null
}
