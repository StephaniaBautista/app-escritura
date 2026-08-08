import type { BackendModule, ReadCallback } from 'i18next'

const cache = new Map<string, Record<string, unknown>>()
const inflight = new Map<string, Promise<Record<string, unknown>>>()

function fetchNamespace(lng: string, ns: string): Promise<Record<string, unknown>> {
  const key = `${lng}:${ns}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  let pending = inflight.get(key)
  if (!pending) {
    pending = fetch(`/api/i18n/${lng}/${ns}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`i18n: ${res.status} para ${key}`)
        return res.json() as Promise<Record<string, unknown>>
      })
      .then((data) => {
        cache.set(key, data)
        return data
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}

export const i18nHttpBackend: BackendModule = {
  type: 'backend',
  init() {},

  read(language: string, namespace: string, callback: ReadCallback) {
    fetchNamespace(language, namespace).then(
      (data) => callback(null, data),
      (err: unknown) => callback(err instanceof Error ? err : new Error(String(err)), null),
    )
  },

  create(languages: readonly string[], namespace: string, key: string, fallbackValue: string) {
    void languages
    void namespace
    void key
    void fallbackValue
  },
}
