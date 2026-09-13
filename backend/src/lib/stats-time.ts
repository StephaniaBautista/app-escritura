import { MemoryCache } from './cache.js'
import { StatsError } from '../services/stats-types.js'

const formatters = new MemoryCache<Intl.DateTimeFormat>({ defaultTtlMs: 24 * 60 * 60 * 1000, maxEntries: 100 })

export function normalizeTimeZone(timeZone = 'UTC'): string {
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timeZone) || timeZone.length > 100) throw new StatsError('STATS_INVALID_TIME_ZONE', 400)
  try { return new Intl.DateTimeFormat('en', { timeZone }).resolvedOptions().timeZone }
  catch { throw new StatsError('STATS_INVALID_TIME_ZONE', 400) }
}

export function localDay(date: Date, timeZone: string): string {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, formatter)
  }
  const parts = formatter.formatToParts(date)
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function splitActivityDays(start: Date, end: Date, timeZone: string) {
  const result: { day: string; activeMilliseconds: number }[] = []
  let cursor = start.getTime()
  const finish = end.getTime()
  while (cursor < finish) {
    const day = localDay(new Date(cursor), timeZone)
    let boundary = finish
    if (localDay(new Date(finish - 1), timeZone) !== day) {
      let low = cursor + 1
      let high = finish
      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        if (localDay(new Date(middle), timeZone) === day) low = middle + 1
        else high = middle
      }
      boundary = low
    }
    result.push({ day, activeMilliseconds: boundary - cursor })
    cursor = boundary
  }
  return result
}
