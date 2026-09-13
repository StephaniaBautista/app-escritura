import { describe, expect, it } from 'vitest'
import { normalizeTimelineConfig, TimelineConfigError } from '../timeline-config.js'

describe('normalizeTimelineConfig', () => {
  it('devuelve relative por defecto', () => {
    expect(normalizeTimelineConfig(undefined)).toEqual({ timeSystem: 'relative' })
    expect(normalizeTimelineConfig({})).toEqual({ timeSystem: 'relative' })
  })

  it('acepta modo era con siglas recortadas', () => {
    expect(normalizeTimelineConfig({
      timeSystem: 'era',
      beforeLabel: '  a.F.  ',
      afterLabel: 'd.F.',
    })).toEqual({ timeSystem: 'era', beforeLabel: 'a.F.', afterLabel: 'd.F.' })
  })

  it('recorta siglas a 10 caracteres', () => {
    expect(normalizeTimelineConfig({ timeSystem: 'era', beforeLabel: '12345678901' }).beforeLabel).toBe('1234567890')
  })

  it('rechaza timeSystem inválido', () => {
    expect(() => normalizeTimelineConfig({ timeSystem: 'julian' })).toThrow(TimelineConfigError)
  })

  it('rechaza valores no objeto', () => {
    expect(() => normalizeTimelineConfig('relative')).toThrow(TimelineConfigError)
  })
})
