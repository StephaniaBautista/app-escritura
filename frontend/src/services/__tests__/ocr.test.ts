import { describe, expect, it, vi, beforeEach } from 'vitest'
import { extractOcrText, OcrApiError } from '../ocr'

describe('extractOcrText', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('no llama a la API si el mime es inválido', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const file = new File([new Uint8Array(8)], 'x.gif', { type: 'image/gif' })

    await expect(extractOcrText(file)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envía FormData sin Content-Type y devuelve text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: '  Magia antigua  ' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File([new Uint8Array(8)], 'scan.png', { type: 'image/png' })

    await expect(extractOcrText(file)).resolves.toBe('  Magia antigua  ')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/ocr')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.headers).toBeUndefined()
  })

  it('mapea códigos de error del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 415,
      json: async () => ({ error: 'UNSUPPORTED_TYPE' }),
    }))
    const file = new File([new Uint8Array(8)], 'scan.png', { type: 'image/png' })

    await expect(extractOcrText(file)).rejects.toBeInstanceOf(OcrApiError)
    await expect(extractOcrText(file)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' })
  })
})
