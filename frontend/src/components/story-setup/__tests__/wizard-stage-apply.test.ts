import { describe, expect, it } from 'vitest'
import { applyStageValue, mergeAiMetaPatch, mergeUniqueStrings } from '../wizard-stage-apply'

describe('applyStageValue', () => {
  it('writes types and ships without dropping the rest of the meta', () => {
    const typed = applyStageValue('Ada llega.', { narrator: 'tercera' }, 'type', ['Romance', 'Drama'])
    expect(typed.meta).toEqual({ narrator: 'tercera', type: ['Romance', 'Drama'] })
    const ships = applyStageValue(typed.description, typed.meta, 'ships', ['Ada/Bea'])
    expect(ships.meta.ships).toEqual(['Ada/Bea'])
    expect(ships.meta.type).toEqual(['Romance', 'Drama'])
  })

  it('adds ships instead of replacing the previous ones', () => {
    const next = applyStageValue(
      'Ada llega.',
      { ships: ['Ada/Bea'] },
      'ships',
      ['Ada/Bea', 'Cal & Ada', '  '],
    )
    expect(next.meta.ships).toEqual(['Ada/Bea', 'Cal & Ada'])
  })

  it('does not duplicate ships that only differ by case or spaces', () => {
    const next = applyStageValue('', { ships: ['Ada/Bea'] }, 'ships', ['ada/bea', ' Ada/Bea '])
    expect(next.meta.ships).toEqual(['Ada/Bea'])
  })
})

describe('mergeAiMetaPatch', () => {
  it('merges ships from the AI patch and keeps other patch fields as replacement', () => {
    const next = mergeAiMetaPatch(
      { ships: ['Ada/Bea'], type: ['Drama'], rating: 'teen' },
      { ships: ['Cal/Ada'], type: ['Romance'], narrator: 'tercera' },
    )
    expect(next.ships).toEqual(['Ada/Bea', 'Cal/Ada'])
    expect(next.type).toEqual(['Romance'])
    expect(next.rating).toBe('teen')
    expect(next.narrator).toBe('tercera')
  })

  it('leaves ships untouched when the patch has none', () => {
    const next = mergeAiMetaPatch({ ships: ['Ada/Bea'] }, { tags: ['angst'] })
    expect(next.ships).toEqual(['Ada/Bea'])
    expect(next.tags).toEqual(['angst'])
  })
})

describe('mergeUniqueStrings', () => {
  it('preserves order of existing then new unique items', () => {
    expect(mergeUniqueStrings(['B', 'A'], ['C', 'a', 'D'])).toEqual(['B', 'A', 'C', 'D'])
  })
})
