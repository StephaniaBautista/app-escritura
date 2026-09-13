import { shiftDay } from './stats-time.js'

export interface DailyWritingTotal { day: string; wordsAdded: number; activeMilliseconds: number }

export function calculateWritingStats(history: DailyWritingTotal[], today: string, rangeDays: number, totalWords: number) {
  const from = shiftDay(today, 1 - rangeDays)
  const byDay = new Map(history.map((row) => [row.day, row]))
  const days = Array.from({ length: rangeDays }, (_, offset) => {
    const date = shiftDay(from, offset)
    const row = byDay.get(date)
    return { date, wordsAdded: row?.wordsAdded ?? 0, activeSeconds: (row?.activeMilliseconds ?? 0) / 1000 }
  })
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
    today, trackedSince: trackedDates[0] ?? null, range: { from, to: today }, days,
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
