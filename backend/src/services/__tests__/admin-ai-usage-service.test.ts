import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({ db: { aiUsageEvent: { findMany: vi.fn() } } }))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
import { adminAiUsageService } from '../admin-ai-usage-service.js'

describe('admin AI usage report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.aiUsageEvent.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-09-02T10:00:00.000Z'), vendor: 'muse', model: 'muse-spark-1.3-contributor', preset: 'saver',
        promptTokens: 1000, completionTokens: 200, costMicros: 140,
      },
      {
        createdAt: new Date('2026-09-02T11:00:00.000Z'), vendor: 'openai', model: 'gpt-5.6-luna', preset: 'private',
        promptTokens: 500, completionTokens: 80, costMicros: 2000,
      },
    ])
  })

  it('aggregates spend by real model names', async () => {
    const report = await adminAiUsageService.report('2026-09-01T00:00:00.000Z', '2026-09-13T00:00:00.000Z')
    expect(report.models[0]).toMatchObject({ vendor: 'openai', model: 'gpt-5.6-luna', estimatedUsd: 0.002 })
    expect(report.totals.requests).toBe(2)
    expect(report.totals.totalTokens).toBe(1780)
    expect(report.days).toHaveLength(13)
    expect(report.days.find((day) => day.date === '2026-09-02')?.requests).toBe(2)
  })

  it('rejects ranges longer than a year', async () => {
    await expect(adminAiUsageService.report('2020-01-01T00:00:00.000Z', '2026-09-13T00:00:00.000Z')).rejects.toThrow('INVALID_RANGE')
    expect(db.aiUsageEvent.findMany).not.toHaveBeenCalled()
  })
})
