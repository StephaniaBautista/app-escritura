import { microsToUsd } from './ai-pricing.js'

const DAY_MS = 24 * 60 * 60 * 1000

export interface UsageEventRow {
  createdAt: Date
  vendor: string
  model: string
  preset: string
  promptTokens: number
  completionTokens: number
  costMicros: number
}

export interface UsageMetricRow {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedUsd: number
}

export interface UsageModelRow extends UsageMetricRow {
  vendor: string
  model: string
  preset: string
}

export interface UsageDayRow extends UsageMetricRow {
  date: string
}

function emptyMetrics(): UsageMetricRow {
  return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedUsd: 0 }
}

function addEvent(target: UsageMetricRow, event: UsageEventRow) {
  target.requests += 1
  target.promptTokens += event.promptTokens
  target.completionTokens += event.completionTokens
  target.totalTokens += event.promptTokens + event.completionTokens
  target.estimatedUsd += microsToUsd(event.costMicros)
}

function roundUsd(value: number) {
  return microsToUsd(Math.round(value * 1_000_000))
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function utcDaysInRange(from: Date, to: Date): string[] {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  const days: string[] = []
  for (let time = start; time <= end; time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

export function summarizeAiUsage(events: UsageEventRow[], from: Date, to: Date) {
  const models = new Map<string, UsageModelRow>()
  const byDay = new Map<string, UsageDayRow>()
  for (const day of utcDaysInRange(from, to)) {
    byDay.set(day, { date: day, ...emptyMetrics() })
  }
  for (const event of events) {
    const key = `${event.vendor}\0${event.model}\0${event.preset}`
    const model = models.get(key) ?? { vendor: event.vendor, model: event.model, preset: event.preset, ...emptyMetrics() }
    addEvent(model, event)
    models.set(key, model)
    const day = byDay.get(utcDay(event.createdAt))
    if (day) addEvent(day, event)
  }
  const modelRows = [...models.values()]
    .map((row) => ({ ...row, estimatedUsd: roundUsd(row.estimatedUsd) }))
    .sort((left, right) => right.estimatedUsd - left.estimatedUsd || right.totalTokens - left.totalTokens)
  const days = [...byDay.values()].map((row) => ({ ...row, estimatedUsd: roundUsd(row.estimatedUsd) }))
  const totals = modelRows.reduce((acc, row) => ({
    requests: acc.requests + row.requests,
    promptTokens: acc.promptTokens + row.promptTokens,
    completionTokens: acc.completionTokens + row.completionTokens,
    totalTokens: acc.totalTokens + row.totalTokens,
    estimatedUsd: acc.estimatedUsd + row.estimatedUsd,
  }), emptyMetrics())
  return {
    models: modelRows,
    days,
    totals: { ...totals, estimatedUsd: roundUsd(totals.estimatedUsd) },
  }
}
