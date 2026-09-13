import { describe, expect, it } from 'vitest'
import { DAY, MONTH, YEAR } from '../timeline-scale'
import {
  coerceParts,
  datePartsToMinutes,
  describeEraPosition,
  eraContaining,
  eraRange,
  eraRelativeYear,
  formatDateParts,
  formatDateText,
  formatYearLabel,
  normalizeTimelineConfig,
  parseDateParts,
  precisionOf,
  serializeDateParts,
  yearsFromRawDates,
  buildYearOptions,
  YEAR_OPTION_RADIUS,
} from '../timeline-date'
import type { TimelineEra } from '@/types/timeline'

const fmt = { monthNames: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], yearUnit: 'años' }

function era(over: Partial<TimelineEra>): TimelineEra {
  return {
    id: 'era',
    projectId: 'p',
    name: 'Sucesos de OZ',
    color: null,
    precision: 'year',
    startDate: '-100',
    endDate: '-80',
    rollover: 'newYear',
    order: 0,
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

describe('parseDateParts / serializeDateParts', () => {
  it('parsea cada nivel de precisión', () => {
    expect(parseDateParts('-90')).toEqual({ year: -90 })
    expect(parseDateParts('-90-04')).toEqual({ year: -90, month: 4 })
    expect(parseDateParts('12-04-07')).toEqual({ year: 12, month: 4, day: 7 })
    expect(parseDateParts('12-04-07 09:05')).toEqual({ year: 12, month: 4, day: 7, hour: 9, minute: 5 })
  })

  it('devuelve null para texto libre', () => {
    expect(parseDateParts('Año 3')).toBeNull()
    expect(parseDateParts('-90 años')).toBeNull()
    expect(parseDateParts(null)).toBeNull()
  })

  it('acota mes, día y hora a rangos válidos', () => {
    expect(parseDateParts('1-13-40 25:99')).toEqual({ year: 1, month: 12, day: 31, hour: 23, minute: 59 })
  })

  it('serializa según la precisión pedida', () => {
    const parts = { year: -20, month: 3, day: 9, hour: 7, minute: 30 }
    expect(serializeDateParts(parts, 'year')).toBe('-20')
    expect(serializeDateParts(parts, 'month')).toBe('-20-03')
    expect(serializeDateParts(parts, 'day')).toBe('-20-03-09')
    expect(serializeDateParts(parts, 'minute')).toBe('-20-03-09 07:30')
  })

  it('roundtrip conserva las partes', () => {
    const raw = '-5-11-30 23:59'
    expect(serializeDateParts(parseDateParts(raw)!, 'minute')).toBe(raw)
  })
})

describe('coerceParts / precisionOf', () => {
  it('rellena partes faltantes con el inicio del período', () => {
    expect(coerceParts({ year: 3 }, 'day')).toEqual({ year: 3, month: 1, day: 1 })
    expect(coerceParts({ year: 3, month: 5, day: 9 }, 'year')).toEqual({ year: 3 })
  })

  it('detecta la precisión de unas partes', () => {
    expect(precisionOf({ year: 1 })).toBe('year')
    expect(precisionOf({ year: 1, month: 2 })).toBe('month')
    expect(precisionOf({ year: 1, month: 2, day: 3 })).toBe('day')
    expect(precisionOf({ year: 1, month: 2, day: 3, hour: 4, minute: 0 })).toBe('minute')
  })
})

describe('datePartsToMinutes', () => {
  it('coloca el instante en la escala en minutos', () => {
    expect(datePartsToMinutes({ year: -99 })).toBe(-99 * YEAR)
    expect(datePartsToMinutes({ year: 2, month: 3, day: 4 })).toBe(2 * YEAR + 2 * MONTH + 3 * DAY)
  })
})

describe('formatYearLabel / normalizeTimelineConfig', () => {
  const relative = { timeSystem: 'relative' as const }
  const eraConfig = { timeSystem: 'era' as const, beforeLabel: 'a.F.', afterLabel: 'd.F.' }
  const fallbacks = { before: 'AC', after: 'DC', yearUnit: 'años' }

  it('modo relativo conserva años con signo', () => {
    expect(formatYearLabel(-90, relative, fallbacks)).toBe('-90 años')
    expect(formatYearLabel(45, relative, fallbacks)).toBe('45 años')
  })

  it('modo era mapea sin año 0 (convención astronómica)', () => {
    expect(formatYearLabel(2045, { timeSystem: 'era' }, fallbacks)).toBe('2045 DC')
    expect(formatYearLabel(-44, { timeSystem: 'era' }, fallbacks)).toBe('45 AC')
    expect(formatYearLabel(0, { timeSystem: 'era' }, fallbacks)).toBe('1 AC')
  })

  it('usa siglas personalizadas del proyecto', () => {
    expect(formatYearLabel(-44, eraConfig, fallbacks)).toBe('45 a.F.')
    expect(formatYearLabel(12, eraConfig, fallbacks)).toBe('12 d.F.')
  })

  it('formatea fechas completas en modo era', () => {
    const eraFmt = { ...fmt, timelineConfig: { timeSystem: 'era' as const }, eraBefore: 'AC', eraAfter: 'DC' }
    expect(formatDateParts({ year: -44, month: 4 }, eraFmt)).toBe('Abr 45 AC')
  })

  it('normaliza config desconocida a relative', () => {
    expect(normalizeTimelineConfig(null)).toEqual({ timeSystem: 'relative' })
    expect(normalizeTimelineConfig({ timeSystem: 'era', beforeLabel: '  AC  ' })).toEqual({
      timeSystem: 'era',
      beforeLabel: 'AC',
    })
  })
})

describe('formatDateParts / formatDateText', () => {
  it('formatea según las partes presentes', () => {
    expect(formatDateParts({ year: -99 }, fmt)).toBe('-99 años')
    expect(formatDateParts({ year: -20, month: 1 }, fmt)).toBe('Ene -20 años')
    expect(formatDateParts({ year: -20, month: 1, day: 1 }, fmt)).toBe('1 Ene -20 años')
    expect(formatDateParts({ year: 0, month: 6, day: 15, hour: 8, minute: 5 }, fmt)).toBe('15 Jun 0 años 08:05')
  })

  it('deja pasar texto libre legado', () => {
    expect(formatDateText('Era de los dragones', fmt)).toBe('Era de los dragones')
    expect(formatDateText(null, fmt)).toBeNull()
  })
})

describe('eraRelativeYear', () => {
  it('newYear: cuenta el cambio de año calendario (+1)', () => {
    const e = era({ startDate: '-100', rollover: 'newYear' })
    expect(eraRelativeYear(e, -99 * YEAR)).toBe(2)
    expect(eraRelativeYear(e, -90 * YEAR)).toBe(11)
    expect(eraRelativeYear(e, -84 * YEAR)).toBe(17)
    expect(eraRelativeYear(e, -100 * YEAR + 11 * MONTH)).toBe(1)
  })

  it('newYear vs afterYear difieren cuando la época empieza a mitad de año', () => {
    const start = '-10-04'
    const value = -9 * YEAR + MONTH
    expect(eraRelativeYear(era({ startDate: start, rollover: 'newYear' }), value)).toBe(2)
    expect(eraRelativeYear(era({ startDate: start, rollover: 'afterYear' }), value)).toBe(1)
    expect(eraRelativeYear(era({ startDate: start, rollover: 'afterYear' }), -9 * YEAR + 4 * MONTH)).toBe(2)
  })

  it('acepta fechas legadas con unidad y devuelve null sin inicio', () => {
    expect(eraRelativeYear(era({ startDate: '-100 años' }), -99 * YEAR)).toBe(2)
    expect(eraRelativeYear(era({ startDate: null }), 0)).toBeNull()
  })
})

describe('eraRange / eraContaining / describeEraPosition', () => {
  it('normaliza rangos invertidos y abiertos', () => {
    expect(eraRange(era({ startDate: '-80', endDate: '-100' }))).toEqual({ lo: -100 * YEAR, hi: -80 * YEAR })
    expect(eraRange(era({ endDate: null }))).toEqual({ lo: -100 * YEAR, hi: Number.POSITIVE_INFINITY })
    expect(eraRange(era({ startDate: null }))).toBeNull()
  })

  it('incluye todo el último año de una época con precisión de año', () => {
    const e = era({ startDate: '-100', endDate: '-80' })
    expect(eraContaining([e], -80 * YEAR + 11 * MONTH)).toBe(e)
    expect(eraContaining([e], -79 * YEAR)).toBeNull()
    expect(eraContaining([e], -101 * YEAR)).toBeNull()
  })

  it('prefiere la época más corta cuando varias contienen el instante y respeta exclude', () => {
    const outer = era({ id: 'outer', startDate: '-200', endDate: '0' })
    const inner = era({ id: 'inner', startDate: '-100', endDate: '-80' })
    expect(eraContaining([outer, inner], -90 * YEAR)).toBe(inner)
    expect(eraContaining([outer, inner], -90 * YEAR, inner)).toBe(outer)
  })

  it('describe la posición como "nombre N años"', () => {
    const e = era({ startDate: '-100', endDate: '-80' })
    expect(describeEraPosition([e], -90 * YEAR, 'años')).toBe('Sucesos de OZ 11 años')
    expect(describeEraPosition([e], 50 * YEAR, 'años')).toBeNull()
  })
})

describe('yearsFromRawDates / buildYearOptions', () => {
  it('extrae años canónicos y legados', () => {
    expect(yearsFromRawDates(['-90', '-80-04', '12-04-07 09:05', '-5 años', 'libre', null])).toEqual([-90, -80, 12, -5])
  })

  it('genera un rango ±200 alrededor del año seleccionado', () => {
    const years = buildYearOptions(0)
    expect(years[0]).toBe(-YEAR_OPTION_RADIUS)
    expect(years[years.length - 1]).toBe(YEAR_OPTION_RADIUS)
    expect(years).toContain(0)
  })

  it('incluye años de contexto fuera de la ventana recortada', () => {
    const years = buildYearOptions(0, [-5000, 5000])
    expect(years).toContain(-5000)
    expect(years).toContain(5000)
    expect(years.filter((y) => y >= -YEAR_OPTION_RADIUS && y <= YEAR_OPTION_RADIUS)).toHaveLength(YEAR_OPTION_RADIUS * 2 + 1)
  })

  it('incluye el año seleccionado aunque sea NaN-safe (ancla 0)', () => {
    const years = buildYearOptions(Number.NaN)
    expect(years).toContain(0)
    expect(years).not.toContain(Number.NaN)
  })
})
