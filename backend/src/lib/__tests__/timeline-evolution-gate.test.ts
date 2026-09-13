import { describe, expect, it } from 'vitest'
import { parseEventDateValue } from '../timeline-event-date.js'
import { allowTimelineCharacterIds, isTimelineEvolutionLocked } from '../timeline-evolution-gate.js'

const original = { id: 'lyra', evolvesFromId: null as string | null }
const evolved = { id: 'lyra-v2', evolvesFromId: 'lyra' }
const characters = [original, evolved]

describe('parseEventDateValue', () => {
  it('entiende canónico y texto legado', () => {
    expect(parseEventDateValue('-1')).toBe(-525600)
    expect(parseEventDateValue('Año 3')).toBe(3 * 525600)
  })
})

describe('allowTimelineCharacterIds', () => {
  it('descarta la evolución si el original no aparece antes', () => {
    expect(allowTimelineCharacterIds(
      ['lyra', 'lyra-v2'],
      characters,
      [],
      null,
      0,
      parseEventDateValue,
    )).toEqual(['lyra'])
  })

  it('conserva la evolución si el original aparece antes', () => {
    expect(isTimelineEvolutionLocked(
      evolved,
      characters,
      [{ id: 'e1', date: '-1', characterIds: ['lyra'] }],
      null,
      0,
      parseEventDateValue,
    )).toBe(false)
  })
})
