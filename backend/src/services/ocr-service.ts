import { createWorker } from 'tesseract.js'
import type { Worker } from 'tesseract.js'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_OCR_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_OCR_PDF_BYTES = 32 * 1024 * 1024
export const MAX_OCR_UPLOAD_BYTES = MAX_OCR_PDF_BYTES

export function maxOcrBytesForMime(mime: string): number {
  return mime === 'application/pdf' ? MAX_OCR_PDF_BYTES : MAX_OCR_IMAGE_BYTES
}

let workerPromise: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('spa+eng')
  }
  return workerPromise
}

export function resetWorkerForTests(): void {
  workerPromise = null
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(buffer)
  return (data.text ?? '').trim()
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const task = getDocument({ data: new Uint8Array(buffer) })
  const doc = await task.promise
  try {
    const pageTexts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim()
      if (text) pageTexts.push(text)
    }
    if (pageTexts.length > 0) return pageTexts.join('\n')

    const images: Buffer[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const ops = await page.getOperatorList()
      for (let j = 0; j < ops.fnArray.length; j++) {
        if (ops.fnArray[j] === OPS.paintImageXObject) {
          const name = ops.argsArray[j][0] as string
          try {
            const img = await page.objs.get(name)
            if (img?.data) images.push(Buffer.from(img.data))
          } catch {
            // skip non-extractable image objects
          }
        }
      }
    }

    const ocrTexts: string[] = []
    for (const image of images) {
      ocrTexts.push(await extractTextFromImage(image))
    }
    return ocrTexts.join('\n').trim()
  } finally {
    await task.destroy()
  }
}

export function isAllowedOcrMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mime) || mime === 'application/pdf'
}
