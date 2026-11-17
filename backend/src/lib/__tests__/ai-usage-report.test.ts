import { describe, expect, it } from 'vitest'
import { summarizeAiUsage, utcDaysInRange } from '../ai-usage-report.js'

describe('AI usage report summary', () => {
  it('builds daily series and model spend from events', () => {
    const from = new Date('2026-09-01T00:00:00.000Z')
    const to = new Date('2026-09-03T00:00:00.000Z')
    const report = summarizeAiUsage([
      {
        createdAt: new Date('2026-09-01T12:00:00.000Z'), vendor: 'openai', model: 'gpt-5.6-luna', preset: 'private',
        promptTokens: 500, completionTokens: 80, costMicros: 2000,
      },
      {
        createdAt: new Date('2026-09-01T18:00:00.000Z'), vendor: 'muse', model: 'muse-spark-1.3-contributor', preset: 'saver',
        promptTokens: 1000, completionTokens: 200, costMicros: 140,
      },
      {
        createdAt: new Date('2026-09-03T08:00:00.000Z'), vendor: 'openai', model: 'gpt-5.6-luna', preset: 'private',
        promptTokens: 100, completionTokens: 20, costMicros: 400,
      },
    ], from, to)
    expect(utcDaysInRange(from, to)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    expect(report.days.map((day) => day.requests)).toEqual([2, 0, 1])
    expect(report.models[0]).toMatchObject({ vendor: 'openai', model: 'gpt-5.6-luna', requests: 2, estimatedUsd: 0.0024 })
    expect(report.totals.requests).toBe(3)
    expect(report.totals.totalTokens).toBe(1900)
  })
})
