import { prisma } from '../lib/prisma.js'
import { summarizeAiUsage } from '../lib/ai-usage-report.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 366 * DAY_MS

function parseBound(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export const adminAiUsageService = {
  async report(from?: string, to?: string) {
    const now = new Date()
    const rangeEnd = parseBound(to, now)
    const rangeStart = parseBound(from, new Date(rangeEnd.getTime() - 30 * DAY_MS))
    if (rangeEnd.getTime() - rangeStart.getTime() > MAX_RANGE_MS || rangeEnd < rangeStart) {
      throw new Error('INVALID_RANGE')
    }
    const events = await prisma.aiUsageEvent.findMany({
      where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: {
        createdAt: true, vendor: true, model: true, preset: true,
        promptTokens: true, completionTokens: true, costMicros: true,
      },
    })
    const summary = summarizeAiUsage(events, rangeStart, rangeEnd)
    return {
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
      ...summary,
    }
  },
}
