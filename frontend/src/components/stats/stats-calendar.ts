import type { StatsDay } from '@/types/stats'

const dayMilliseconds = 86_400_000

export function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`)
}

export function completeStatsDays(from: string, to: string, days: StatsDay[]): StatsDay[] {
  const start = calendarDate(from).getTime()
  const end = calendarDate(to).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 366 * dayMilliseconds) return []
  const data = new Map(days.map((day) => [day.date, day]))
  const result: StatsDay[] = []
  for (let time = start; time <= end; time += dayMilliseconds) {
    const date = new Date(time).toISOString().slice(0, 10)
    result.push(data.get(date) ?? { date, wordsAdded: 0, activeSeconds: 0 })
  }
  return result
}

export function calendarWeeks(days: StatsDay[]): (StatsDay | null)[][] {
  if (!days.length) return []
  const offset = (calendarDate(days[0].date).getUTCDay() + 6) % 7
  const cells: (StatsDay | null)[] = [...Array.from({ length: offset }, () => null), ...days]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))
}

export function contributionLevel(words: number): 0 | 1 | 2 | 3 | 4 {
  if (words <= 0) return 0
  if (words < 100) return 1
  if (words < 500) return 2
  if (words < 1000) return 3
  return 4
}

export function motivationIndex(date: string, count: number): number {
  const days = Math.floor(calendarDate(date).getTime() / dayMilliseconds)
  return Number.isFinite(days) && count > 0 ? ((days % count) + count) % count : 0
}
