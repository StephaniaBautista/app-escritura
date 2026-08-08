interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export interface MemoryCacheOptions {
  defaultTtlMs?: number
  maxEntries?: number
}

export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>()
  private readonly defaultTtlMs: number
  private readonly maxEntries: number

  constructor(options: MemoryCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000
    this.maxEntries = options.maxEntries ?? 500
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs)
    this.store.set(key, { value, expiresAt })
    this.prune()
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }

  private prune(): void {
    if (this.store.size <= this.maxEntries) return
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
  }
}
