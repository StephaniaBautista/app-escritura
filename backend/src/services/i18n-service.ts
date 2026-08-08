import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryCache } from '../lib/cache.js'

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'locales')
const VALID_LANGUAGES = ['es', 'en']

interface Manifest {
  version: string
  core: string[]
  namespaces: string[]
}

function readManifest(): Manifest {
  const path = join(LOCALES_DIR, 'manifest.json')
  if (!existsSync(path)) {
    throw new Error(`No se encontró locales/manifest.json en ${LOCALES_DIR}`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

const manifest = readManifest()
const allowedNamespaces = new Set(manifest.namespaces)

interface CachedNamespace {
  data: Record<string, unknown>
  mtimeMs: number
}

const cache = new MemoryCache<CachedNamespace>({ defaultTtlMs: 60 * 60 * 1000, maxEntries: 200 })

export const i18nService = {
  getSupportedLanguages(): string[] {
    return [...VALID_LANGUAGES]
  },

  getNamespaces(): string[] {
    return [...allowedNamespaces]
  },

  getNamespace(lng: string, ns: string): Record<string, unknown> | null {
    if (!VALID_LANGUAGES.includes(lng)) return null
    if (!allowedNamespaces.has(ns)) return null

    const key = `${lng}:${ns}`
    const file = join(LOCALES_DIR, lng, `${ns}.json`)
    if (!existsSync(file)) return null

    const mtimeMs = statSync(file).mtimeMs
    const cached = cache.get(key)
    if (cached && cached.mtimeMs === mtimeMs) return cached.data

    const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    cache.set(key, { data, mtimeMs })
    return data
  },

  invalidate(): void {
    cache.clear()
  },
}
