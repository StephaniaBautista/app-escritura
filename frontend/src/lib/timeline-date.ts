import type { TimelineEra, TimelinePrecision, TimelineConfig, TimelineTimeSystem } from '@/types/timeline'
import { DEFAULT_TIMELINE_CONFIG } from '@/types/timeline'
import { DAY, HOUR, MINUTE, MONTH, WEEK, YEAR, parseDateValue } from './timeline-scale'

export interface DateParts {
  year: number
  month?: number
  day?: number
  hour?: number
  minute?: number
}

export const PRECISION_ORDER: TimelinePrecision[] = ['year', 'month', 'day', 'minute']

const CANONICAL_RE = /^(-?\d+)(?:-(\d{1,2}))?(?:-(\d{1,2}))?(?:\s+(\d{1,2}):(\d{2}))?$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function parseDateParts(raw: string | null | undefined): DateParts | null {
  if (!raw) return null
  const m = CANONICAL_RE.exec(raw.trim())
  if (!m) return null
  const parts: DateParts = { year: parseInt(m[1], 10) }
  if (m[2] !== undefined) parts.month = Math.min(12, Math.max(1, parseInt(m[2], 10)))
  if (m[3] !== undefined) parts.day = Math.min(31, Math.max(1, parseInt(m[3], 10)))
  if (m[4] !== undefined) {
    parts.hour = Math.min(23, Math.max(0, parseInt(m[4], 10)))
    parts.minute = Math.min(59, Math.max(0, parseInt(m[5], 10)))
  }
  return parts
}

export function serializeDateParts(parts: DateParts, precision: TimelinePrecision): string {
  let out = String(parts.year)
  if (precision === 'year') return out
  out += `-${pad(parts.month ?? 1)}`
  if (precision === 'month') return out
  out += `-${pad(parts.day ?? 1)}`
  if (precision === 'day') return out
  return `${out} ${pad(parts.hour ?? 0)}:${pad(parts.minute ?? 0)}`
}

export function datePartsToMinutes(parts: DateParts): number {
  return (
    parts.year * YEAR +
    ((parts.month ?? 1) - 1) * MONTH +
    ((parts.day ?? 1) - 1) * DAY +
    (parts.hour ?? 0) * HOUR +
    (parts.minute ?? 0)
  )
}

export function precisionOf(parts: DateParts): TimelinePrecision {
  if (parts.hour !== undefined) return 'minute'
  if (parts.day !== undefined) return 'day'
  if (parts.month !== undefined) return 'month'
  return 'year'
}

export function coerceParts(parts: DateParts, precision: TimelinePrecision): DateParts {
  const idx = PRECISION_ORDER.indexOf(precision)
  const out: DateParts = { year: parts.year }
  if (idx >= 1) out.month = parts.month ?? 1
  if (idx >= 2) out.day = parts.day ?? 1
  if (idx >= 3) {
    out.hour = parts.hour ?? 0
    out.minute = parts.minute ?? 0
  }
  return out
}

export interface DateFormatOptions {
  monthNames: string[]
  yearUnit: string
  eraBefore?: string
  eraAfter?: string
  timelineConfig?: TimelineConfig
}

export interface EraLabelFallbacks {
  before: string
  after: string
  yearUnit: string
}

export function normalizeTimelineConfig(raw: unknown): TimelineConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_TIMELINE_CONFIG
  const input = raw as Record<string, unknown>
  const timeSystem: TimelineTimeSystem = input.timeSystem === 'era' ? 'era' : 'relative'
  const beforeLabel = typeof input.beforeLabel === 'string' ? input.beforeLabel.trim().slice(0, 10) : undefined
  const afterLabel = typeof input.afterLabel === 'string' ? input.afterLabel.trim().slice(0, 10) : undefined
  return {
    timeSystem,
    ...(beforeLabel ? { beforeLabel } : {}),
    ...(afterLabel ? { afterLabel } : {}),
  }
}

export function formatYearLabel(year: number, config: TimelineConfig, fallbacks: EraLabelFallbacks): string {
  if (config.timeSystem === 'era') {
    const before = config.beforeLabel?.trim() || fallbacks.before
    const after = config.afterLabel?.trim() || fallbacks.after
    if (year >= 1) return `${year} ${after}`
    return `${1 - year} ${before}`
  }
  return `${year} ${fallbacks.yearUnit}`
}

export function formatDateParts(parts: DateParts, opts: DateFormatOptions): string {
  const config = opts.timelineConfig ?? DEFAULT_TIMELINE_CONFIG
  const fallbacks: EraLabelFallbacks = {
    before: opts.eraBefore ?? 'AC',
    after: opts.eraAfter ?? 'DC',
    yearUnit: opts.yearUnit,
  }
  const year = formatYearLabel(parts.year, config, fallbacks)
  if (parts.month === undefined) return year
  const month = opts.monthNames[parts.month - 1] ?? String(parts.month)
  if (parts.day === undefined) return `${month} ${year}`
  const day = `${parts.day} ${month} ${year}`
  if (parts.hour === undefined) return day
  return `${day} ${pad(parts.hour)}:${pad(parts.minute ?? 0)}`
}

export function formatDateText(raw: string | null | undefined, opts: DateFormatOptions): string | null {
  if (!raw) return null
  const parts = parseDateParts(raw)
  return parts ? formatDateParts(parts, opts) : raw
}

export function yearOf(value: number): number {
  return Math.floor(value / YEAR)
}

export function eraRelativeYear(era: Pick<TimelineEra, 'startDate' | 'rollover'>, value: number): number | null {
  const start = parseDateValue(era.startDate)
  if (start === null) return null
  const elapsed = era.rollover === 'afterYear'
    ? Math.floor((value - start) / YEAR)
    : yearOf(value) - yearOf(start)
  return elapsed + 1
}

export function eraRange(era: Pick<TimelineEra, 'startDate' | 'endDate'>): { lo: number; hi: number } | null {
  const s = parseDateValue(era.startDate)
  const e = parseDateValue(era.endDate)
  if (s === null) return null
  if (e === null) return { lo: s, hi: Number.POSITIVE_INFINITY }
  return { lo: Math.min(s, e), hi: Math.max(s, e) }
}

const PRECISION_UNIT: Record<string, number> = { year: YEAR, month: MONTH, week: WEEK, day: DAY, hour: HOUR, minute: MINUTE }

type EraLike = Pick<TimelineEra, 'startDate' | 'endDate' | 'precision'>

export function eraContaining<T extends EraLike>(eras: T[], value: number, exclude?: T): T | null {
  let best: T | null = null
  let bestSpan = Number.POSITIVE_INFINITY
  for (const era of eras) {
    if (era === exclude) continue
    const range = eraRange(era)
    if (!range) continue
    const slack = (PRECISION_UNIT[era.precision] ?? YEAR) - 1
    if (value < range.lo || value > range.hi + slack) continue
    const span = range.hi - range.lo
    if (span < bestSpan) {
      best = era
      bestSpan = span
    }
  }
  return best
}

export function describeEraPosition(eras: TimelineEra[], value: number, yearUnit: string, exclude?: TimelineEra): string | null {
  const era = eraContaining(eras, value, exclude)
  if (!era) return null
  const rel = eraRelativeYear(era, value)
  if (rel === null) return null
  return `${era.name} ${rel} ${yearUnit}`
}

export const YEAR_OPTION_RADIUS = 200
export const YEAR_OPTION_MAX_SPAN = 800

export function yearsFromRawDates(raws: readonly (string | null | undefined)[]): number[] {
  const years: number[] = []
  for (const raw of raws) {
    const parts = parseDateParts(raw)
    if (parts) {
      years.push(parts.year)
      continue
    }
    const legacy = parseDateValue(raw)
    if (legacy !== null) years.push(Math.round(legacy / YEAR))
  }
  return years
}

export function buildYearOptions(selectedYear: number, contextYears: readonly number[] = []): number[] {
  const extras = contextYears.filter((y) => Number.isFinite(y))
  if (Number.isFinite(selectedYear)) extras.push(selectedYear)
  const anchor = Number.isFinite(selectedYear) ? selectedYear : 0
  let min = anchor - YEAR_OPTION_RADIUS
  let max = anchor + YEAR_OPTION_RADIUS
  for (const y of extras) {
    if (y < min) min = y
    if (y > max) max = y
  }
  if (max - min > YEAR_OPTION_MAX_SPAN) {
    min = anchor - YEAR_OPTION_RADIUS
    max = anchor + YEAR_OPTION_RADIUS
  }
  const years = new Set<number>()
  for (let y = min; y <= max; y++) years.add(y)
  for (const y of extras) years.add(y)
  return [...years].sort((a, b) => a - b)
}
