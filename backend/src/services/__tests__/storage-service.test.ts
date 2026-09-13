import { describe, it, expect, vi, beforeEach } from 'vitest'

const { supabaseMock } = vi.hoisted(() => {
  const remove = vi.fn()
  const upload = vi.fn()
  const createBucket = vi.fn()
  return {
    supabaseMock: {
      getSupabaseAdmin: vi.fn(),
      SUPABASE_BUCKET: 'character-images',
      SUPABASE_RACE_BUCKET: 'race-images',
      SUPABASE_CREATURE_BUCKET: 'creature-images',
      storage: {
        from: vi.fn((bucket: string) => ({
          upload,
          remove,
          getPublicUrl: vi.fn((path: string) => ({
            data: { publicUrl: `https://xyz.supabase.co/storage/v1/object/public/${bucket}/${path}` },
          })),
        })),
        createBucket,
      },
      __upload: upload,
      __remove: remove,
      __createBucket: createBucket,
    },
  }
})

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseAdmin: supabaseMock.getSupabaseAdmin,
  SUPABASE_BUCKET: supabaseMock.SUPABASE_BUCKET,
  SUPABASE_RACE_BUCKET: supabaseMock.SUPABASE_RACE_BUCKET,
  SUPABASE_CREATURE_BUCKET: supabaseMock.SUPABASE_CREATURE_BUCKET,
}))

import {
  storageService,
  validateImage,
  validatePdf,
  sanitizePdfName,
  extractPathFromPublicUrl,
  extractStorageRef,
  StorageUnavailableError,
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  MAX_LORE_PDF_BYTES,
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

  it('reconoce el blob de razas', () => {
    expect(extractStorageRef('https://x.supabase.co/storage/v1/object/public/race-images/races/abc/1.png')).toEqual({
      bucket: 'race-images',
      path: 'races/abc/1.png',
    })
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

  describe('uploadLorePdf', () => {
    it('sube un PDF válido a lore/<id>/<uuid>.pdf', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })
      const pdf = Buffer.concat([Buffer.from('%PDF-'), Buffer.from('body')])

      const url = await storageService.uploadLorePdf('lore-1', pdf, 'application/pdf')

      expect(supabaseMock.__upload).toHaveBeenCalledWith(
        expect.stringMatching(/^lore\/lore-1\/.+\.pdf$/),
        pdf,
        expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
      )
      expect(url).toContain('/character-images/lore/lore-1/')
    })
  })

  describe('uploadRacePdf', () => {
    it('sube un PDF válido a races/<id>/<uuid>.pdf en character-images', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })
      const pdf = Buffer.concat([Buffer.from('%PDF-'), Buffer.from('body')])

      const url = await storageService.uploadRacePdf('race-1', pdf, 'application/pdf')

      expect(supabaseMock.__upload).toHaveBeenCalledWith(
        expect.stringMatching(/^races\/race-1\/.+\.pdf$/),
        pdf,
        expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
      )
      expect(url).toContain('/character-images/races/race-1/')
    })
  })

  describe('uploadRaceImage', () => {
    it('sube al bucket race-images, no al de personajes', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })

      const url = await storageService.uploadRaceImage('race-1', Buffer.from('img'), 'image/png')

      expect(supabaseMock.storage.from).toHaveBeenCalledWith('race-images')
      expect(url).toContain('/race-images/races/race-1/')
    })

    it('crea el bucket si no existe y reintenta', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload
        .mockResolvedValueOnce({ error: new Error('Bucket not found') })
        .mockResolvedValueOnce({ error: null })
      supabaseMock.__createBucket.mockResolvedValue({ error: null })

      const url = await storageService.uploadRaceImage('race-1', Buffer.from('img'), 'image/png')

      expect(supabaseMock.__createBucket).toHaveBeenCalledWith(
        'race-images',
        expect.objectContaining({ public: true }),
      )
      expect(url).toContain('/race-images/races/race-1/')
    })
  })

  describe('uploadCreatureImage', () => {
    it('sube al bucket creature-images', async () => {
      supabaseMock.getSupabaseAdmin.mockReturnValue(supabaseMock)
      supabaseMock.__upload.mockResolvedValue({ error: null })

      const url = await storageService.uploadCreatureImage('c-1', Buffer.from('img'), 'image/png')

      expect(supabaseMock.storage.from).toHaveBeenCalledWith('creature-images')
      expect(url).toContain('/creature-images/creatures/c-1/')
    })
  })
})

describe('validatePdf', () => {
  const pdf = Buffer.concat([Buffer.from('%PDF-'), Buffer.from('1.4')])

  it('acepta un buffer con cabecera PDF', () => {
    expect(() => validatePdf(pdf, 'application/pdf')).not.toThrow()
  })

  it('rechaza mime distinto', () => {
    expect(() => validatePdf(pdf, 'image/png')).toThrow('no permitido')
  })

  it('rechaza archivos sin cabecera PDF', () => {
    expect(() => validatePdf(Buffer.from('not-pdf'), 'application/pdf')).toThrow('no es un PDF')
  })

  it('rechaza PDFs de más de 10 MB', () => {
    expect(() => validatePdf(Buffer.alloc(MAX_LORE_PDF_BYTES + 1, 0), 'application/pdf')).toThrow('10 MB')
  })
})

describe('sanitizePdfName', () => {
  it('quita rutas y asegura extensión .pdf', () => {
    expect(sanitizePdfName('../../secreto.txt')).toBe('secreto.txt.pdf')
    expect(sanitizePdfName('Ficha magia.pdf')).toBe('Ficha magia.pdf')
  })
})
