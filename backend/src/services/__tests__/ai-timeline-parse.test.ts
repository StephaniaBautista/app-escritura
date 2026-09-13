import { describe, expect, it } from 'vitest'
import { eraHasEvidence, eventHasEvidence, parseTimelineFill, TIMELINE_MAX_EVENTS } from '../ai-timeline-parse.js'
import { AiServiceError } from '../ai-types.js'

describe('timeline fill parse', () => {
  it('keeps allowed era and event keys', () => {
    const fill = parseTimelineFill(JSON.stringify({
      eras: [{ name: 'Era imperial', startDate: '1', precision: 'year' }],
      events: [{ title: 'Coronación', description: 'El rey jura.', eraName: 'Era imperial', characterNames: ['Ada'] }],
    }))
    expect(fill.eras[0]).toEqual({ name: 'Era imperial', startDate: '1', precision: 'year' })
    expect(fill.events[0]).toEqual({
      title: 'Coronación', description: 'El rey jura.', eraName: 'Era imperial', characterNames: ['Ada'],
    })
    expect(eraHasEvidence(fill.eras[0]!)).toBe(true)
    expect(eventHasEvidence(fill.events[0]!)).toBe(true)
  })

  it('accepts many events without a low cap', () => {
    const events = Array.from({ length: 20 }, (_, index) => ({ title: `Evento ${index + 1}` }))
    const fill = parseTimelineFill(JSON.stringify({ eras: [{ name: 'Una' }], events }))
    expect(fill.events).toHaveLength(20)
    expect(TIMELINE_MAX_EVENTS).toBe(50)
  })

  it('rejects unknown fields, prototype keys and oversized lists', () => {
    expect(() => parseTimelineFill(JSON.stringify({ eras: [{ name: 'A', color: '#fff' }], events: [] }))).toThrow(AiServiceError)
    expect(() => parseTimelineFill(JSON.stringify({ eras: [{ name: 'A', constructor: 'x' }], events: [] }))).toThrow(AiServiceError)
    expect(() => parseTimelineFill(JSON.stringify({
      eras: [],
      events: Array.from({ length: 51 }, (_, index) => ({ title: `E${index}` })),
    }))).toThrow(AiServiceError)
  })

  it('drops invalid precision instead of inventing a value', () => {
    const fill = parseTimelineFill(JSON.stringify({
      eras: [{ name: 'Era', precision: 'century' }],
      events: [{ title: 'Acto', precision: 'week' }],
    }))
    expect(fill.eras[0]).toEqual({ name: 'Era' })
    expect(fill.events[0]).toEqual({ title: 'Acto' })
  })
})
