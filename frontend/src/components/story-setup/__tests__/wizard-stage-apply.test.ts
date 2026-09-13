import { describe, expect, it } from 'vitest'
import { applyStageValue } from '../wizard-stage-apply'

describe('applyStageValue', () => {
  it('writes types and ships without dropping the rest of the meta', () => {
    const typed = applyStageValue('Ada llega.', { narrator: 'tercera' }, 'type', ['Romance', 'Drama'])
    expect(typed.meta).toEqual({ narrator: 'tercera', type: ['Romance', 'Drama'] })
    const ships = applyStageValue(typed.description, typed.meta, 'ships', ['Ada/Bea'])
    expect(ships.meta.ships).toEqual(['Ada/Bea'])
    expect(ships.meta.type).toEqual(['Romance', 'Drama'])
  })
})
