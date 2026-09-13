import { getSupabaseAdmin, SUPABASE_BUCKET, SUPABASE_CREATURE_BUCKET, SUPABASE_RACE_BUCKET } from '../lib/supabase.js'
import { randomUUID } from 'node:crypto'

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_LORE_PDF_BYTES = MAX_PDF_BYTES

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export class StorageUnavailableError extends Error {
  constructor() {
    super('Supabase Storage no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    this.name = 'StorageUnavailableError'
  }
}

export function validateImage(buffer: Buffer, mime: string): string {
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    throw new Error('Tipo de imagen no permitido (jpeg, png, webp, gif)')
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo de 3 MB')
  }
  return MIME_EXT[mime]
}

export function validatePdf(buffer: Buffer, mime: string): void {
  if (mime !== 'application/pdf') {
    throw new Error('Tipo de archivo no permitido (pdf)')
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error('El PDF supera el tamaño máximo de 10 MB')
  }
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('El archivo no es un PDF válido')
  }
}

export function sanitizePdfName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || 'adjunto.pdf'
  const cleaned = base.replace(/[^\w.\- ()áéíóúüñÁÉÍÓÚÜÑ]/g, '_').slice(0, 180)
  const withExt = cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned || 'adjunto'}.pdf`
  return withExt
}

export const storageService = {
  async uploadCharacterImage(characterId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_BUCKET, `${characterId}-${Date.now()}`, buffer, mime)
  },

  async uploadCharacterHeightMapImage(characterId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_BUCKET, `height-map/${characterId}/${randomUUID()}`, buffer, mime)
  },

  async uploadCharacterBackgroundImage(characterId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_BUCKET, `background/${characterId}/${randomUUID()}`, buffer, mime)
  },

  async uploadTimelineImage(eventId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_BUCKET, `timeline/${eventId}/${randomUUID()}`, buffer, mime)
  },

  async uploadRaceImage(raceId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_RACE_BUCKET, `races/${raceId}/${randomUUID()}`, buffer, mime)
  },

  async uploadCreatureImage(creatureId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_CREATURE_BUCKET, `creatures/${creatureId}/${randomUUID()}`, buffer, mime)
  },

  async uploadMapBackground(mapId: string, buffer: Buffer, mime: string) {
    return uploadImage(SUPABASE_BUCKET, `maps/${mapId}/${randomUUID()}`, buffer, mime)
  },

  async uploadLorePdf(loreId: string, buffer: Buffer, mime: string) {
    return uploadPdf(`lore/${loreId}`, buffer, mime)
  },

  async uploadRacePdf(raceId: string, buffer: Buffer, mime: string) {
    return uploadPdf(`races/${raceId}`, buffer, mime)
  },

  async deleteCharacterImage(url: string) {
    const client = getSupabaseAdmin()
    if (!client) return false

    const ref = extractStorageRef(url)
    if (!ref) return false

    const { error } = await client.storage.from(ref.bucket).remove([ref.path])
    return !error
  },
}

async function uploadPdf(pathPrefix: string, buffer: Buffer, mime: string) {
  const client = getSupabaseAdmin()
  if (!client) throw new StorageUnavailableError()
  validatePdf(buffer, mime)
  const path = `${pathPrefix}/${randomUUID()}.pdf`
  const { error } = await client.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (error) throw error
  const { data } = client.storage.from(SUPABASE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function uploadImage(bucket: string, pathPrefix: string, buffer: Buffer, mime: string) {
  const client = getSupabaseAdmin()
  if (!client) throw new StorageUnavailableError()

  const ext = validateImage(buffer, mime)
  const path = `${pathPrefix}.${ext}`
  let { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error && isMissingBucket(error)) {
    const created = await client.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
    })
    if (created.error && !isBucketExists(created.error)) throw created.error
    ;({ error } = await client.storage.from(bucket).upload(path, buffer, {
      contentType: mime,
      upsert: false,
    }))
  }
  if (error) throw error

  const { data } = client.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return String(error)
}

function isMissingBucket(error: unknown): boolean {
  return /bucket not found/i.test(errorMessage(error))
}

function isBucketExists(error: unknown): boolean {
  return /already exists/i.test(errorMessage(error))
}

export function extractStorageRef(url: string): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url)
    const marker = '/storage/v1/object/public/'
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null
    const rest = parsed.pathname.slice(idx + marker.length)
    const slash = rest.indexOf('/')
    if (slash <= 0) return null
    const bucket = decodeURIComponent(rest.slice(0, slash))
    const path = decodeURIComponent(rest.slice(slash + 1))
    if (!bucket || !path) return null
    return { bucket, path }
  } catch {
    return null
  }
}

export function extractPathFromPublicUrl(url: string): string | null {
  return extractStorageRef(url)?.path ?? null
}
