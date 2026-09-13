import { describe, expect, it } from 'vitest'
import { minWordsForGaps } from '../ai-wizard-eligibility.js'
import { timelineGapCount } from '../ai-timeline-eligibility.js'

describe('timeline fill eligibility', () => {
  it('counts discovery slots plus empty fields', () => {
    expect(timelineGapCount([], [])).toBe(2 + 4 + 5)
    expect(timelineGapCount(
      [{ name: 'Era', startDate: '1', endDate: '2' }],
      [{ title: 'Acto', description: 'd', date: '1', endDate: '2', eraId: 'e1', characterIds: ['c1'] }],
    )).toBe(2)
  })

  it('reuses the wizard word threshold', () => {
    expect(minWordsForGaps(timelineGapCount([], []))).toBe(200)
    expect(minWordsForGaps(2)).toBe(80)
  })
})
