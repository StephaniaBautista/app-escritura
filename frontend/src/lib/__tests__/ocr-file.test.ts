import { describe, expect, it } from 'vitest'
import { OCR_MAX_IMAGE_BYTES, OCR_MAX_PDF_BYTES, validateOcrFile } from '../ocr-file'

function file(type: string, size: number) {
  const created = new File([new Uint8Array(1)], 'scan.bin', { type })
  Object.defineProperty(created, 'size', { value: size })
  return created
}

describe('validateOcrFile', () => {
  it('acepta jpeg/png/webp/pdf dentro del límite', () => {
    expect(validateOcrFile(file('image/jpeg', 12))).toBeNull()
    expect(validateOcrFile(file('image/png', 12))).toBeNull()
    expect(validateOcrFile(file('image/webp', 12))).toBeNull()
    expect(validateOcrFile(file('application/pdf', OCR_MAX_IMAGE_BYTES + 1))).toBeNull()
  })

  it('rechaza mime no permitido', () => {
    expect(validateOcrFile(file('image/gif', 12))).toBe('UNSUPPORTED_TYPE')
    expect(validateOcrFile(file('text/plain', 12))).toBe('UNSUPPORTED_TYPE')
  })

  it('imágenes tope 10 MB y PDF tope 32 MB', () => {
    expect(validateOcrFile(file('image/png', OCR_MAX_IMAGE_BYTES + 1))).toBe('FILE_TOO_LARGE')
    expect(validateOcrFile(file('application/pdf', OCR_MAX_PDF_BYTES))).toBeNull()
    expect(validateOcrFile(file('application/pdf', OCR_MAX_PDF_BYTES + 1))).toBe('FILE_TOO_LARGE')
  })
})
