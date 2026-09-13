import { describe, expect, it } from 'vitest'
import { commitHistory, initHistory, redoHistory, undoHistory } from '../map-history'

describe('map-history', () => {
  it('deshacer y rehacer restauran el lienzo', () => {
    let state = initHistory({ n: 1 })
    state = commitHistory(state, { n: 2 })
    state = commitHistory(state, { n: 3 })
    state = undoHistory(state)
    expect(state.present).toEqual({ n: 2 })
    state = undoHistory(state)
    expect(state.present).toEqual({ n: 1 })
    state = redoHistory(state)
    expect(state.present).toEqual({ n: 2 })
  })

  it('un commit nuevo borra el futuro', () => {
    let state = commitHistory(initHistory({ n: 1 }), { n: 2 })
    state = undoHistory(state)
    state = commitHistory(state, { n: 9 })
    expect(state.future).toEqual([])
    expect(state.present).toEqual({ n: 9 })
  })
})
