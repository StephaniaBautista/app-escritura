import { describe, expect, it } from 'vitest'
import {
  buildTicks,
  clampSpan,
  DAY,
  HOUR,
  initialWindow,
  MINUTE,
  MONTH,
  pannedWindow,
  parseDateValue,
  posPercent,
  valueAtFrac,
  WEEK,
  YEAR,
  zoomedWindow,
} from '../timeline-scale'

describe('parseDateValue', () => {
  it('convierte años a minutos', () => {
    expect(parseDateValue('-10 años')).toBe(-10 * YEAR)
    expect(parseDateValue('Año 3')).toBe(3 * YEAR)
    expect(parseDateValue('2 years')).toBe(2 * YEAR)
  })

  it('convierte unidades menores', () => {
    expect(parseDateValue('2 meses')).toBe(2 * MONTH)
    expect(parseDateValue('3 weeks')).toBe(3 * WEEK)
    expect(parseDateValue('5 días')).toBe(5 * DAY)
    expect(parseDateValue('4 horas')).toBe(4 * HOUR)
    expect(parseDateValue('30 minutos')).toBe(30 * MINUTE)
  })

  it('devuelve null sin número', () => {
    expect(parseDateValue('Era de los dragones')).toBeNull()
    expect(parseDateValue(null)).toBeNull()
    expect(parseDateValue('')).toBeNull()
  })
})

describe('initialWindow', () => {
  it('cubre el rango de datos con margen', () => {
    const win = initialWindow([-YEAR, YEAR])
    expect(win.span).toBeGreaterThanOrEqual(2 * YEAR)
    expect(win.center).toBe(0)
  })

  it('vacío produce ventana por defecto válida', () => {
    const win = initialWindow([])
    expect(win.span).toBeGreaterThan(0)
  })
})

describe('zoomedWindow', () => {
  it('acercar reduce el span y alejar lo amplía', () => {
    const win = { center: 0, span: YEAR }
    expect(zoomedWindow(win, 0.5).span).toBeLessThan(YEAR)
    expect(zoomedWindow(win, 2).span).toBeGreaterThan(YEAR)
  })

  it('mantiene fijo el valor bajo el ancla', () => {
    const win = { center: 1000, span: 4000 }
    const frac = 0.25
    const before = valueAtFrac(win, frac)
    const next = zoomedWindow(win, 0.5, frac)
    expect(valueAtFrac(next, frac)).toBeCloseTo(before, 5)
  })

  it('respeta los límites de span', () => {
    expect(clampSpan(zoomedWindow({ center: 0, span: MINUTE }, 0.001).span)).toBeGreaterThanOrEqual(30 * MINUTE)
    expect(clampSpan(zoomedWindow({ center: 0, span: YEAR * 300000 }, 10).span)).toBeLessThanOrEqual(YEAR * 200000)
  })
})

describe('pannedWindow', () => {
  it('arrastrar a la derecha mueve la vista hacia el pasado', () => {
    const next = pannedWindow({ center: 0, span: 1000 }, 0.5)
    expect(next.center).toBe(-500)
    expect(next.span).toBe(1000)
  })
})

describe('posPercent', () => {
  it('es monótono y se acota a 0-100', () => {
    const win = { center: 0, span: 3 * YEAR }
    expect(posPercent(win, -YEAR)).toBeLessThan(posPercent(win, 0))
    expect(posPercent(win, 0)).toBeLessThan(posPercent(win, YEAR))
    expect(posPercent(win, YEAR * 99)).toBe(100)
    expect(posPercent(win, -YEAR * 99)).toBe(0)
  })
})

describe('buildTicks', () => {
  it('años con pasos redondos al ver décadas', () => {
    const ticks = buildTicks({ center: 0, span: 40 * YEAR })
    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks.some((tk) => tk.amount === 0 && tk.unitKey === 'unitYears')).toBe(true)
    ticks.forEach((tk) => {
      expect(tk.at).toBeGreaterThanOrEqual(-20 * YEAR)
      expect(tk.at).toBeLessThanOrEqual(20 * YEAR)
    })
  })

  it('baja a minutos al acercar mucho', () => {
    const ticks = buildTicks({ center: 0, span: 30 * MINUTE })
    expect(ticks.every((tk) => tk.unitKey === 'unitMinutes')).toBe(true)
    expect(ticks.length).toBeGreaterThan(1)
  })

  it('usa horas en lapsos de horas', () => {
    const ticks = buildTicks({ center: 0, span: 48 * HOUR })
    expect(ticks[0].unitKey).toBe('unitHours')
  })

  it('usa meses o semanas en lapsos de meses', () => {
    const ticks = buildTicks({ center: 0, span: 3 * MONTH })
    expect(['unitMonths', 'unitWeeks', 'unitDays']).toContain(ticks[0].unitKey)
  })
})
