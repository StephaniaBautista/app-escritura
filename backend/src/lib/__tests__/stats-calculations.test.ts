import { describe, expect, it } from 'vitest'
import { calculateWritingStats, descendantDocumentIds } from '../stats-calculations.js'
import { localDay, normalizeTimeZone, shiftDay, splitActivityDays } from '../stats-time.js'

describe('statistics dates and streaks', () => {
  it('uses local dates on either side of UTC midnight', () => {
    const now = new Date('2026-09-12T01:00:00Z')
    expect(localDay(now, 'America/Mexico_City')).toBe('2026-09-11')
    expect(localDay(now, 'Asia/Tokyo')).toBe('2026-09-12')
    expect(normalizeTimeZone()).toBe('UTC')
  })
  it.each(['Not/AZone', '+05:00', '', '../America', 'x'.repeat(101)])('rejects invalid time zone %s', (zone) => {
    expect(() => normalizeTimeZone(zone)).toThrow('STATS_INVALID_TIME_ZONE')
  })
  it('handles leap days and year boundaries', () => {
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDay('2024-02-29', 1)).toBe('2024-03-01')
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('splits credited time at local midnight exactly', () => {
    expect(splitActivityDays(new Date('2026-09-12T05:59:50Z'), new Date('2026-09-12T06:00:05Z'), 'America/Mexico_City')).toEqual([
      { day: '2026-09-11', activeMilliseconds: 10_000 }, { day: '2026-09-12', activeMilliseconds: 5_000 },
    ])
  })
  it('does not assume 24-hour days across DST', () => {
    const segments = splitActivityDays(new Date('2026-03-08T05:00:00Z'), new Date('2026-03-09T04:00:00Z'), 'America/New_York')
    expect(segments).toEqual([{ day: '2026-03-08', activeMilliseconds: 23 * 60 * 60 * 1000 }])
  })
  it('includes zero days in the average and excludes time-only days from streaks', () => {
    const result = calculateWritingStats([
      { day: '2026-09-10', wordsAdded: 30, activeMilliseconds: 0 },
      { day: '2026-09-11', wordsAdded: 60, activeMilliseconds: 1500 },
      { day: '2026-09-12', wordsAdded: 0, activeMilliseconds: 2000 },
    ], '2026-09-12', 30, 500)
    expect(result.days).toHaveLength(30)
    expect(result.summary).toEqual({ totalWords: 500, wordsAdded: 90, activeSeconds: 3.5, activeDays: 2, currentStreak: 2, longestStreak: 2, dailyAverage: 3, todayWords: 0 })
  })
  it('calculates streaks beyond the visible 365-day range', () => {
    const history = Array.from({ length: 400 }, (_, index) => ({ day: shiftDay('2026-09-12', -399 + index), wordsAdded: 1, activeMilliseconds: 0 }))
    const result = calculateWritingStats(history, '2026-09-12', 365, 400)
    expect(result.summary.currentStreak).toBe(400)
    expect(result.summary.longestStreak).toBe(400)
    expect(result.summary.wordsAdded).toBe(365)
    expect(result.trackedSince).toBe(history[0]!.day)
  })
  it('ends the current streak after a missed yesterday', () => {
    expect(calculateWritingStats([{ day: '2026-09-10', wordsAdded: 1, activeMilliseconds: 0 }], '2026-09-12', 30, 0).summary.currentStreak).toBe(0)
  })
  it('returns empty history without fabricated tracking date', () => {
    expect(calculateWritingStats([], '2026-09-12', 30, 100).trackedSince).toBeNull()
  })
  it('includes descendant chapters and terminates malformed cycles', () => {
    expect(descendantDocumentIds([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }, { id: 'd', parentId: null }], 'a').sort()).toEqual(['a', 'b', 'c'])
  })
})
