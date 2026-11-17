import { describe, expect, it } from 'vitest'
import { calendarWeeks, completeStatsDays, contributionLevel, motivationIndex } from '../stats-calendar'

describe('writing calendar dates', () => {
  it('includes leap days and fills only missing dates with real zero totals', () => {
    const days = completeStatsDays('2024-02-28', '2024-03-01', [{ date: '2024-02-29', wordsAdded: 21, activeSeconds: 30 }])
    expect(days).toEqual([{ date: '2024-02-28', wordsAdded: 0, activeSeconds: 0 }, { date: '2024-02-29', wordsAdded: 21, activeSeconds: 30 }, { date: '2024-03-01', wordsAdded: 0, activeSeconds: 0 }])
  })
  it('keeps civil dates stable across daylight saving changes and year boundaries', () => {
    expect(completeStatsDays('2026-03-07', '2026-03-09', []).map((day) => day.date)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09'])
    const days = completeStatsDays('2025-12-31', '2026-01-02', [])
    expect(days.map((day) => day.date)).toEqual(['2025-12-31', '2026-01-01', '2026-01-02'])
    const weeks = calendarWeeks(days)
    expect(weeks[0].slice(0, 2)).toEqual([null, null])
    expect(weeks.flat().filter(Boolean)).toEqual(days)
  })
  it('does not fabricate active cells for all-zero days or invalid ranges', () => {
    expect(contributionLevel(0)).toBe(0)
    expect(completeStatsDays('invalid', '2026-01-01', [])).toEqual([])
    expect(completeStatsDays('2026-01-02', '2026-01-01', [])).toEqual([])
  })
  it('uses a deterministic encouragement for a date independently of render timing', () => {
    expect(motivationIndex('2026-09-12', 6)).toBe(motivationIndex('2026-09-12', 6))
    expect(motivationIndex('2026-09-18', 6)).toBe(motivationIndex('2026-09-12', 6))
  })
})
