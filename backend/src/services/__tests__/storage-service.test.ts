import { describe, it, expect, vi, beforeEach } from 'vitest'

const { supabaseMock } = vi.hoisted(() => {
  const remove = vi.fn()
  const upload = vi.fn()
  return {
    supabaseMock: {
      getSupabaseAdmin: vi.fn(),
      SUPABASE_BUCKET: 'character-images',
      storage: {
        from: vi.fn(() => ({
          upload,
          remove,
          getPublicUrl: vi.fn((path: string) => ({
            data: { publicUrl: `https://xyz.supabase.co/storage/v1/object/public/character-images/${path}` },
          })),
        })),
      },
      __upload: upload,
      __remove: remove,
    },
  }
})

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseAdmin: supabaseMock.getSupabaseAdmin,
  SUPABASE_BUCKET: supabaseMock.SUPABASE_BUCKET,
}))

import {
  storageService,
  validateImage,
  extractPathFromPublicUrl,
  StorageUnavailableError,
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
} from '../storage-service.js'

describe('validateImage', () => {
  it('acepta jpeg, png, webp y gif', () => {
    expect(validateImage(Buffer.alloc(10), 'image/jpeg')).toBe('jpg')
    expect(validateImage(Buffer.alloc(10), 'image/png')).toBe('png')
    expect(validateImage(Buffer.alloc(10), 'image/webp')).toBe('webp')
    expect(validateImage(Buffer.alloc(10), 'image/gif')).toBe('gif')
  })

  it('rechaza mime no permitido', () => {
    expect(() => validateImage(Buffer.alloc(10), 'image/svg+xml')).toThrow('no permitido')
  })

  it('rechaza imágenes de más de 3 MB', () => {
    expect(() => validateImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png')).toThrow('3 MB')
  })

  it('explica los mimes permitidos', () => {
    expect(ALLOWED_IMAGE_MIMES.size).toBe(4)
  })
})

describe('extractPathFromPublicUrl', () => {
  it('extrae la ruta tras el bucket', () => {
    expect(extractPathFromPublicUrl('https://x.supabase.co/storage/v1/object/public/character-images/char-1-123.png')).toBe('char-1-123.png')
  })

  it('devuelve null si la url no contiene el bucket', () => {
    expect(extractPathFromPublicUrl('https://x.supabase.co/other/file.png')).toBeNull()
  })

  it('devuelve null ante una url inválida', () => {
    expect(extractPathFromPublicUrl('not a url')).toBeNull()
  })
})

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadCharacterImage', () => {
    it('lanza StorageUnavailableError si no hay configuración', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(null)

      await expect(storageService.uploadCharacterImage('char-1', Buffer.from('x'), 'image/png')).rejects.toBeInstanceOf(StorageUnavailableError)
    })

    it('sube con el path y devuelve la URL pública', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })
      vi.spyOn(Date, 'now').mockReturnValue(1234)

      const url = await storageService.uploadCharacterImage('char-1', Buffer.from('img'), 'image/png')

      expect(supabaseMock.__upload).toHaveBeenCalledWith(
        'char-1-1234.png',
        Buffer.from('img'),
        expect.objectContaining({ contentType: 'image/png', upsert: false }),
      )
      expect(url).toContain('/character-images/char-1-1234.png')
    })

    it('propaga errores de subida', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: new Error('storage full') })

      await expect(storageService.uploadCharacterImage('char-1', Buffer.from('x'), 'image/png')).rejects.toThrow('storage full')
    })
  })

  describe('uploadCharacterBackgroundImage', () => {
    it('usa una ruta aislada por personaje y devuelve la URL pública', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })

      const url = await storageService.uploadCharacterBackgroundImage('char-1', Buffer.from('img'), 'image/png')

      expect(supabaseMock.__upload).toHaveBeenCalledWith(
        expect.stringMatching(/^background\/char-1\/.+\.png$/),
        Buffer.from('img'),
        expect.objectContaining({ contentType: 'image/png', upsert: false }),
      )
      expect(url).toContain('/character-images/background/char-1/')
    })
  })

  describe('deleteCharacterImage', () => {
    it('borra el objeto correspondiente a la url', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__remove.mockResolvedValue({ error: null })

      const ok = await storageService.deleteCharacterImage('https://x.supabase.co/storage/v1/object/public/character-images/char-1-1.png')

      expect(supabaseMock.__remove).toHaveBeenCalledWith(['char-1-1.png'])
      expect(ok).toBe(true)
    })

    it('devuelve false sin config', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(null)

      const ok = await storageService.deleteCharacterImage('https://x.supabase.co/storage/v1/object/public/character-images/char-1-1.png')

      expect(ok).toBe(false)
    })
  })
})
