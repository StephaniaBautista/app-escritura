import { getSupabaseAdmin, SUPABASE_BUCKET } from '../lib/supabase.js'
import { randomUUID } from 'node:crypto'

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024

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

export const storageService = {
  async uploadCharacterImage(characterId: string, buffer: Buffer, mime: string) {
    return uploadImage(`${characterId}-${Date.now()}`, buffer, mime)
  },

  async uploadCharacterBackgroundImage(characterId: string, buffer: Buffer, mime: string) {
    return uploadImage(`background/${characterId}/${randomUUID()}`, buffer, mime)
  },

  async deleteCharacterImage(url: string) {
    const client = getSupabaseAdmin()
    if (!client) return false

    const path = extractPathFromPublicUrl(url)
    if (!path) return false

    const { error } = await client.storage.from(SUPABASE_BUCKET).remove([path])
    return !error
  },
}

async function uploadImage(pathPrefix: string, buffer: Buffer, mime: string) {
  const client = getSupabaseAdmin()
  if (!client) throw new StorageUnavailableError()

  const ext = validateImage(buffer, mime)
  const path = `${pathPrefix}.${ext}`
  const { error } = await client.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw error

  const { data } = client.storage.from(SUPABASE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function extractPathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const bucketIndex = parts.indexOf(SUPABASE_BUCKET)
    if (bucketIndex === -1) return null
    return parts.slice(bucketIndex + 1).join('/')
  } catch {
    return null
  }
}
