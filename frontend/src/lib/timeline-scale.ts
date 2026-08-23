export const MINUTE = 1
export const HOUR = 60
export const DAY = 1440
export const WEEK = 10080
export const MONTH = 43200
export const YEAR = 525600

export const SPAN_MIN = 30 * MINUTE
export const SPAN_MAX = YEAR * 200000

export interface TimeWindow {
  center: number
  span: number
}

export interface Tick {
  at: number
  amount: number
  unitKey: UnitKey
}

const UNIT_TABLE = [
  { base: YEAR, key: 'unitYears' },
  { base: MONTH, key: 'unitMonths' },
  { base: WEEK, key: 'unitWeeks' },
  { base: DAY, key: 'unitDays' },
  { base: HOUR, key: 'unitHours' },
  { base: MINUTE, key: 'unitMinutes' },
] as const

export type UnitKey = (typeof UNIT_TABLE)[number]['key']

function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / pow
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * pow
}

export function clampSpan(span: number): number {
  if (!Number.isFinite(span)) return SPAN_MAX
  return Math.min(SPAN_MAX, Math.max(SPAN_MIN, span))
}

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

const VALUE_RE = /(-?\d+(?:[.,]\d+)?)/
const UNIT_RE = /(-?\d+(?:[.,]\d+)?)\s*(minutos?|mins?|hours?|horas?|d[ií]as?|days?|semanas?|weeks?|meses?|months?|a[ñn]os?|years?)/i

export function parseDateValue(date: string | null): number | null {
  if (!date) return null
  const withUnit = date.match(UNIT_RE)
  if (withUnit) {
    const value = toNumber(withUnit[1])
    const unit = withUnit[2].toLowerCase()
    let base = YEAR
    if (/^min/.test(unit)) base = MINUTE
    else if (/^(hora|hour)/.test(unit)) base = HOUR
    else if (/^(d[ií]a|day)/.test(unit)) base = DAY
    else if (/^(semana|week)/.test(unit)) base = WEEK
    else if (/^(mes|month)/.test(unit)) base = MONTH
    return value * base
  }
  const plain = date.match(VALUE_RE)
  if (!plain) return null
  return toNumber(plain[0]) * YEAR
}

export function initialWindow(values: number[]): TimeWindow {
  if (values.length === 0) return { center: 0, span: YEAR * 50 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const raw = max === min ? DAY : (max - min) * 1.4
  return { center: (min + max) / 2, span: clampSpan(raw) }
}

export function posPercent(win: TimeWindow, value: number): number {
  const lo = win.center - win.span / 2
  const frac = (value - lo) / win.span
  return Math.min(100, Math.max(0, frac * 100))
}

export function valueAtFrac(win: TimeWindow, frac: number): number {
  return win.center + (frac - 0.5) * win.span
}

export function zoomedWindow(win: TimeWindow, factor: number, anchorFrac = 0.5): TimeWindow {
  const span = clampSpan(win.span * factor)
  const anchor = valueAtFrac(win, anchorFrac)
  return { center: anchor - (anchorFrac - 0.5) * span, span }
}

export function pannedWindow(win: TimeWindow, deltaFrac: number): TimeWindow {
  return { center: win.center - deltaFrac * win.span, span: win.span }
}

export function buildTicks(win: TimeWindow): Tick[] {
  const lo = win.center - win.span / 2
  const hi = win.center + win.span / 2
  for (const unit of UNIT_TABLE) {
    const step = niceStep(win.span / unit.base / 5)
    if (step < 1) continue
    const stepMinutes = step * unit.base
    const ticks: Tick[] = []
    for (let k = Math.ceil(lo / stepMinutes); k <= Math.floor(hi / stepMinutes); k++) {
      ticks.push({ at: k * stepMinutes, amount: Number((k * step).toFixed(2)), unitKey: unit.key })
    }
    return ticks
  }
  return []
}
