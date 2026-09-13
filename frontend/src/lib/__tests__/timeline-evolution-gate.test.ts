import { describe, expect, it } from 'vitest'
import { parseDateValue } from '../timeline-scale'
import {
  allowTimelineCharacterIds,
  evolutionRootId,
  isTimelineEvolutionLocked,
} from '../timeline-evolution-gate'

const original = { id: 'lyra', evolvesFromId: null }
const evolved = { id: 'lyra-v2', evolvesFromId: 'lyra' }
const later = { id: 'lyra-v3', evolvesFromId: 'lyra-v2' }
const characters = [original, evolved, later]
const parse = parseDateValue

describe('timeline-evolution-gate', () => {
  it('resuelve la raíz de la cadena', () => {
    const byId = new Map(characters.map((c) => [c.id, c]))
    expect(evolutionRootId('lyra-v3', byId)).toBe('lyra')
  })

  it('bloquea la evolución si el original no aparece antes', () => {
    expect(isTimelineEvolutionLocked(evolved, characters, [], null, 0, parse)).toBe(true)
    expect(isTimelineEvolutionLocked(evolved, characters, [
      { id: 'e1', date: '10', characterIds: ['lyra'] },
    ], null, 0, parse)).toBe(true)
  })

  it('desbloquea si el original aparece en un evento anterior', () => {
    expect(isTimelineEvolutionLocked(evolved, characters, [
      { id: 'e1', date: '-1', characterIds: ['lyra'] },
    ], null, 0, parse)).toBe(false)
  })

  it('no cuenta el propio evento ni una fecha igual', () => {
    expect(isTimelineEvolutionLocked(evolved, characters, [
      { id: 'current', date: '-5', characterIds: ['lyra'] },
    ], 'current', 0, parse)).toBe(true)
    expect(isTimelineEvolutionLocked(evolved, characters, [
      { id: 'e1', date: '0', characterIds: ['lyra'] },
    ], null, 0, parse)).toBe(true)
  })

  it('exige al original, no a una evolución intermedia', () => {
    expect(isTimelineEvolutionLocked(later, characters, [
      { id: 'e1', date: '-1', characterIds: ['lyra-v2'] },
    ], null, 0, parse)).toBe(true)
    expect(isTimelineEvolutionLocked(later, characters, [
      { id: 'e1', date: '-1', characterIds: ['lyra'] },
    ], null, 0, parse)).toBe(false)
  })

  it('deja pasar al original y descarta evoluciones bloqueadas', () => {
    expect(allowTimelineCharacterIds(
      ['lyra', 'lyra-v2'],
      characters,
      [],
      null,
      0,
      parse,
    )).toEqual(['lyra'])
  })
})
