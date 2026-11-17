import { shiftDay } from './stats-time.js'

export const MAX_STATS_RANGE_DAYS = 730
export const MAX_ALL_TIME_DAYS = 3650
export const STATS_CALENDAR_DAYS = 365
const dayPattern = /^\d{4}-\d{2}-\d{2}$/

export interface DailyWritingTotal { day: string; wordsAdded: number; activeMilliseconds: number }
export interface StatsDateRange { from: string; to: string }

export function isIsoDay(value: string): boolean {
  if (!dayPattern.test(value)) return false
  const date = new Date(`${value}T12:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function inclusiveDayCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / 86_400_000) + 1
}

export function resolveStatsRange(
  today: string,
  query: { allTime?: boolean; from?: string; to?: string; days?: number },
  earliest: string | null,
): StatsDateRange | null {
  if (query.allTime) {
    const from = earliest && isIsoDay(earliest) && earliest <= today ? earliest : today
    const count = inclusiveDayCount(from, today)
    if (count < 1) return null
    if (count > MAX_ALL_TIME_DAYS) return { from: shiftDay(today, 1 - MAX_ALL_TIME_DAYS), to: today }
    return { from, to: today }
  }
  return parseStatsRange(today, query)
}

export function parseStatsRange(today: string, query: { from?: string; to?: string; days?: number }): StatsDateRange | null {
  if ((query.from && !query.to) || (!query.from && query.to)) return null
  if (query.from && query.to) {
    if (!isIsoDay(query.from) || !isIsoDay(query.to) || query.from > today) return null
    const to = query.to > today ? today : query.to
    if (query.from > to) return null
    const count = inclusiveDayCount(query.from, to)
    if (count < 1 || count > MAX_STATS_RANGE_DAYS) return null
    return { from: query.from, to }
  }
  const days = query.days ?? 365
  if (days < 1 || days > MAX_STATS_RANGE_DAYS) return null
  return { from: shiftDay(today, 1 - days), to: today }
}

export function fillStatsDays(history: DailyWritingTotal[], range: StatsDateRange) {
  const byDay = new Map(history.map((row) => [row.day, row]))
  return Array.from({ length: inclusiveDayCount(range.from, range.to) }, (_, offset) => {
    const date = shiftDay(range.from, offset)
    const row = byDay.get(date)
    return { date, wordsAdded: row?.wordsAdded ?? 0, activeSeconds: (row?.activeMilliseconds ?? 0) / 1000 }
  })
}

export function statsCalendarRange(today: string): StatsDateRange {
  return parseStatsRange(today, { days: STATS_CALENDAR_DAYS })!
}

export function calculateWritingStats(history: DailyWritingTotal[], today: string, range: StatsDateRange, totalWords: number) {
  const rangeDays = inclusiveDayCount(range.from, range.to)
  const byDay = new Map(history.map((row) => [row.day, row]))
  const days = fillStatsDays(history, range)
  const activeDates = [...new Set(history.filter((row) => row.wordsAdded > 0 && row.day <= today).map((row) => row.day))].sort()
  let longestStreak = 0
  let running = 0
  let previous: string | undefined
  for (const date of activeDates) {
    running = previous && shiftDay(previous, 1) === date ? running + 1 : 1
    longestStreak = Math.max(longestStreak, running)
    previous = date
  }
  const latest = activeDates[activeDates.length - 1]
  const currentStreak = latest === today || latest === shiftDay(today, -1) ? running : 0
  const wordsAdded = days.reduce((sum, day) => sum + day.wordsAdded, 0)
  const trackedDates = history.filter((row) => row.wordsAdded > 0 || row.activeMilliseconds > 0).map((row) => row.day).sort()
  return {
    today, trackedSince: trackedDates[0] ?? null, range, days,
    summary: {
      totalWords, wordsAdded, activeSeconds: days.reduce((sum, day) => sum + day.activeSeconds, 0),
      activeDays: days.filter((day) => day.wordsAdded > 0).length, currentStreak, longestStreak,
      dailyAverage: Math.round(wordsAdded / rangeDays * 100) / 100, todayWords: byDay.get(today)?.wordsAdded ?? 0,
    },
  }
}

export function descendantDocumentIds(documents: { id: string; parentId: string | null }[], rootId: string): string[] {
  const children = new Map<string, string[]>()
  for (const document of documents) {
    if (document.parentId) children.set(document.parentId, [...(children.get(document.parentId) ?? []), document.id])
  }
  const found = new Set<string>()
  const pending = [rootId]
  while (pending.length) {
    const id = pending.pop()!
    if (found.has(id)) continue
    found.add(id)
    pending.push(...(children.get(id) ?? []))
  }
  return [...found]
}
