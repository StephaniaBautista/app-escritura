import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  removeImageBackground,
  BackgroundRemovalUnavailableError,
  BackgroundRemovalFailedError,
} from '../background-removal'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.PHOTOROOM_API_KEY
})

describe('removeImageBackground', () => {
  it('lanza si no hay API key', async () => {
    await expect(removeImageBackground(Buffer.from('x'), 'image/png')).rejects.toBeInstanceOf(
      BackgroundRemovalUnavailableError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('devuelve el buffer de la respuesta de PhotoRoom', async () => {
    process.env.PHOTOROOM_API_KEY = 'test-key'
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: (k: string) => (k === 'content-type' ? 'image/png' : null) },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })

    const out = await removeImageBackground(Buffer.from('orig'), 'image/jpeg')
    expect(Buffer.from(out)).toEqual(Buffer.from([1, 2, 3]))
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sdk.photoroom.com/v1/segment',
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-api-key': 'test-key' },
      }),
    )
  })

  it('falla si la API no devuelve imagen', async () => {
    process.env.PHOTOROOM_API_KEY = 'test-key'
    fetchMock.mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => 'quota',
      headers: { get: () => 'text/plain' },
    })

    await expect(removeImageBackground(Buffer.from('x'), 'image/png')).rejects.toBeInstanceOf(
      BackgroundRemovalFailedError,
    )
  })
})
