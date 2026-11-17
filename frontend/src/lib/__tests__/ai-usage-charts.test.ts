import { describe, expect, it } from 'vitest'
import { barRects, heatLevel, mergeByLabel, pieSlices, stackSegments } from '../ai-usage-charts'

describe('admin AI usage chart geometry', () => {
  it('merges duplicate labels and drops zeros', () => {
    expect(mergeByLabel([
      { label: 'muse', value: 2 },
      { label: 'openai', value: 1 },
      { label: 'muse', value: 3 },
      { label: 'glm', value: 0 },
    ])).toEqual([
      { label: 'muse', value: 5 },
      { label: 'openai', value: 1 },
    ])
  })

  it('builds a full pie and scaled bars', () => {
    const slices = pieSlices([{ label: 'a', value: 1 }, { label: 'b', value: 1 }], 0, 0, 10)
    expect(slices).toHaveLength(2)
    expect(slices[0]?.percent).toBe(0.5)
    expect(slices[0]?.d).toContain('A 10 10')
    const full = pieSlices([{ label: 'solo', value: 8 }], 60, 60, 48)
    expect(full).toHaveLength(1)
    expect(full[0]?.percent).toBe(1)
    expect(full[0]?.d).toContain('A 48 48 0 1 1')
    const bars = barRects([{ label: 'a', value: 10 }, { label: 'b', value: 5 }], 100, 40, 0)
    expect(bars[0]?.y).toBe(0)
    expect(bars[1]?.height).toBe(20)
  })

  it('splits a stacked token bar by share', () => {
    expect(stackSegments(25, 75, 100, 10)).toEqual({ inputWidth: 25, outputWidth: 75, height: 10 })
    expect(stackSegments(0, 0, 100, 10)).toEqual({ inputWidth: 0, outputWidth: 0, height: 10 })
  })

  it('maps daily activity to heat levels', () => {
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(1, 10)).toBe(1)
    expect(heatLevel(4, 10)).toBe(2)
    expect(heatLevel(7, 10)).toBe(3)
    expect(heatLevel(10, 10)).toBe(4)
  })
})
