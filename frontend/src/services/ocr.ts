import { validateOcrFile, type OcrFileError } from '@/lib/ocr-file'

export class OcrApiError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'OcrApiError'
    this.code = code
  }
}

function errorCodeFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const value = (body as { error: unknown }).error
    if (typeof value === 'string' && value) return value
  }
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 413) return 'FILE_TOO_LARGE'
  if (status === 415) return 'UNSUPPORTED_TYPE'
  if (status === 400) return 'NO_FILE'
  return 'OCR_FAILED'
}

export async function extractOcrText(file: File): Promise<string> {
  const localError: OcrFileError | null = validateOcrFile(file)
  if (localError) throw new OcrApiError(localError)

  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/ocr', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new OcrApiError(errorCodeFromBody(body, res.status))

  if (body && typeof body === 'object' && 'text' in body && typeof (body as { text: unknown }).text === 'string') {
    return (body as { text: string }).text
  }
  return ''
}
