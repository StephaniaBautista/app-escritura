import { describe, expect, it } from 'vitest'
import {
  SUBPLOT_LAYER_COLOR,
  countVisibleSubplots,
  filterVisibleSubplotItems,
  isSubplotVisible,
  subplotLayerColor,
  toggleHiddenSubplot,
} from '../subplot-visibility'

describe('isSubplotVisible', () => {
  it('main-plot items (no subplot) are always visible', () => {
    expect(isSubplotVisible(null, ['a'])).toBe(true)
    expect(isSubplotVisible(undefined, ['a'])).toBe(true)
  })

  it('subplot items are visible unless their subplot is hidden', () => {
    expect(isSubplotVisible('a', [])).toBe(true)
    expect(isSubplotVisible('a', ['b'])).toBe(true)
    expect(isSubplotVisible('a', ['a', 'b'])).toBe(false)
  })
})

describe('filterVisibleSubplotItems', () => {
  it('keeps main-plot items and items of visible subplots, preserving order', () => {
    const items = [
      { id: '1', subplotId: null },
      { id: '2', subplotId: 'a' },
      { id: '3', subplotId: 'b' },
      { id: '4', subplotId: null },
    ]
    expect(filterVisibleSubplotItems(items, ['a']).map((item) => item.id)).toEqual(['1', '3', '4'])
  })
})

describe('toggleHiddenSubplot', () => {
  it('adds and removes without mutating the input', () => {
    const hidden = ['a']
    expect(toggleHiddenSubplot(hidden, 'b')).toEqual(['a', 'b'])
    expect(toggleHiddenSubplot(hidden, 'a')).toEqual([])
    expect(hidden).toEqual(['a'])
  })
})

describe('subplotLayerColor / countVisibleSubplots', () => {
  it('falls back to the violet accent token', () => {
    expect(SUBPLOT_LAYER_COLOR).toBe('var(--color-accent-violet)')
    expect(subplotLayerColor({ color: '#ff0000' })).toBe('#ff0000')
    expect(subplotLayerColor({ color: null })).toBe(SUBPLOT_LAYER_COLOR)
    expect(subplotLayerColor(null)).toBe(SUBPLOT_LAYER_COLOR)
  })

  it('counts subplots not hidden', () => {
    expect(countVisibleSubplots([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['b'])).toBe(2)
  })
})
