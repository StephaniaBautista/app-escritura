import { describe, expect, it } from 'vitest'
import { chartAreaPath, chartPolyline } from '../stats-chart'

describe('statistics chart geometry', () => {
  it('places a single value in the middle and zeros on the baseline', () => {
    expect(chartPolyline([12], 100, 40, 0)).toBe('50.00,0.00')
    expect(chartPolyline([0, 0], 100, 40, 0)).toBe('0.00,40.00 100.00,40.00')
  })
  it('scales the peak to the top and closes an area against the baseline', () => {
    expect(chartPolyline([0, 10], 100, 40, 0)).toBe('0.00,40.00 100.00,0.00')
    expect(chartAreaPath([0, 10], 100, 40, 0)).toBe('M 0.00 40.00 L 0.00,40.00 L 100.00,0.00 L 100.00 40.00 Z')
  })
})
