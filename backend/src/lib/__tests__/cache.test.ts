import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryCache } from '../cache.js'

describe('MemoryCache', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('guarda y recupera valores por clave', () => {
    const cache = new MemoryCache<string>()
    cache.set('a', 'valor')
    expect(cache.get('a')).toBe('valor')
  })

  it('devuelve undefined si la clave no existe', () => {
    const cache = new MemoryCache<string>()
    expect(cache.get('nope')).toBeUndefined()
  })

  it('expira entradas tras el TTL por defecto', () => {
    vi.useFakeTimers()
    const cache = new MemoryCache<string>({ defaultTtlMs: 1000 })
    cache.set('a', 'valor')

    vi.advanceTimersByTime(999)
    expect(cache.get('a')).toBe('valor')

    vi.advanceTimersByTime(2)
    expect(cache.get('a')).toBeUndefined()
  })

  it('respeta un TTL propio por entrada', () => {
    vi.useFakeTimers()
    const cache = new MemoryCache<string>({ defaultTtlMs: 10_000 })
    cache.set('a', 'valor', 500)

    vi.advanceTimersByTime(501)
    expect(cache.get('a')).toBeUndefined()
  })

  it('delete elimina una clave', () => {
    const cache = new MemoryCache<string>()
    cache.set('a', 'valor')
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
  })

  it('clear vacía el cache', () => {
    const cache = new MemoryCache<string>()
    cache.set('a', 'valor')
    cache.set('b', 'otro')
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('no supera maxEntries: descarta la entrada más antigua', () => {
    const cache = new MemoryCache<string>({ maxEntries: 2 })
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')

    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('2')
    expect(cache.get('c')).toBe('3')
  })

  it('la poda elimina primero las expiradas antes de desalojar por límite', () => {
    vi.useFakeTimers()
    const cache = new MemoryCache<string>({ maxEntries: 3, defaultTtlMs: 1000 })
    cache.set('a', '1', 10)
    cache.set('b', '2', 10_000)
    cache.set('c', '3', 10_000)

    vi.advanceTimersByTime(11)
    cache.set('d', '4', 10_000)

    expect(cache.size).toBe(3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('2')
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })
})
