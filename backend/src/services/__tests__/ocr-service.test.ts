import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const recognize = vi.fn()
  const createWorker = vi.fn(() => Promise.resolve({ recognize }))
  const getTextContent = vi.fn()
  const getOperatorList = vi.fn()
  const objs = { get: vi.fn() }
  const getPage = vi.fn(() => ({ getTextContent, getOperatorList, objs }))
  const destroy = vi.fn(() => Promise.resolve())
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({ numPages: 1, getPage }),
    destroy,
  }))
  return { createWorker, recognize, getTextContent, getOperatorList, objs, getDocument, destroy }
})

vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: mocks.getDocument,
  OPS: { paintImageXObject: 85 },
}))

import { extractTextFromImage, extractTextFromPdf, resetWorkerForTests } from '../ocr-service.js'

describe('ocr-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetWorkerForTests()
  })

  it('extractTextFromImage devuelve el texto recortado', async () => {
    mocks.recognize.mockResolvedValue({ data: { text: '  Hola mundo  ' } })

    const text = await extractTextFromImage(Buffer.from('fake'))

    expect(mocks.createWorker).toHaveBeenCalledWith('spa+eng')
    expect(text).toBe('Hola mundo')
  })

  it('reutiliza el worker entre llamadas', async () => {
    mocks.recognize.mockResolvedValue({ data: { text: 'x' } })

    await extractTextFromImage(Buffer.from('a'))
    await extractTextFromImage(Buffer.from('b'))

    expect(mocks.createWorker).toHaveBeenCalledTimes(1)
  })

  it('extractTextFromPdf devuelve el texto si el PDF tiene capa de texto', async () => {
    mocks.getTextContent.mockResolvedValue({ items: [{ str: 'Capítulo uno' }, { str: 'sigue' }] })

    const text = await extractTextFromPdf(Buffer.from('pdf'))

    expect(text).toBe('Capítulo uno sigue')
    expect(mocks.recognize).not.toHaveBeenCalled()
    expect(mocks.destroy).toHaveBeenCalled()
  })

  it('extractTextFromPdf hace OCR de las imágenes si no hay texto', async () => {
    mocks.getTextContent.mockResolvedValue({ items: [] })
    mocks.getOperatorList.mockResolvedValue({ fnArray: [85], argsArray: [['img0']] })
    mocks.objs.get.mockResolvedValue({ data: new Uint8Array([1, 2, 3]) })
    mocks.recognize.mockResolvedValue({ data: { text: 'texto escaneado' } })

    const text = await extractTextFromPdf(Buffer.from('pdf-escaneado'))

    expect(mocks.objs.get).toHaveBeenCalledWith('img0')
    expect(text).toBe('texto escaneado')
  })
})
