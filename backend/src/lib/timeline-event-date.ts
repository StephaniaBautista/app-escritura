const MINUTE = 1
const HOUR = 60
const DAY = 1440
const WEEK = 10080
const MONTH = 43200
const YEAR = 525600

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

const VALUE_RE = /(-?\d+(?:[.,]\d+)?)/
const UNIT_RE = /(-?\d+(?:[.,]\d+)?)\s*(minutos?|mins?|hours?|horas?|d[ií]as?|days?|semanas?|weeks?|meses?|months?|a[ñn]os?|years?)/i
const CANONICAL_RE = /^(-?\d+)(?:-(\d{1,2}))?(?:-(\d{1,2}))?(?:\s+(\d{1,2}):(\d{2}))?$/

function parseCanonical(date: string): number | null {
  const m = CANONICAL_RE.exec(date.trim())
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = m[2] !== undefined ? parseInt(m[2], 10) - 1 : 0
  const day = m[3] !== undefined ? parseInt(m[3], 10) - 1 : 0
  const hour = m[4] !== undefined ? parseInt(m[4], 10) : 0
  const minute = m[5] !== undefined ? parseInt(m[5], 10) : 0
  return year * YEAR + month * MONTH + day * DAY + hour * HOUR + minute
}

export function parseEventDateValue(date: string | null | undefined): number | null {
  if (!date) return null
  const canonical = parseCanonical(date)
  if (canonical !== null) return canonical
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
