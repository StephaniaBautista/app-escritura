import { describe, expect, it } from 'vitest'
import { completeFields, fieldQuality, stageFields, suggestFields } from '../ai-wizard-stages.js'

describe('wizard stage fields', () => {
  it('always includes type on basics and ships on couples', () => {
    expect(stageFields('basics', {})).toEqual(['rating', 'type', 'isFanfic'])
    expect(stageFields('basics', { isFanfic: true })).toEqual(['rating', 'type', 'isFanfic', 'fandoms'])
    expect(stageFields('couples', { type: ['Drama'] })).toEqual(['categories', 'ships'])
    expect(stageFields('couples', { isFanfic: false })).toEqual(['categories', 'ships'])
  })
})

describe('wizard field quality', () => {
  it('treats a single type or ship as thin so the stage can still complete', () => {
    expect(fieldQuality('type', '', { type: [] })).toBe('empty')
    expect(fieldQuality('type', '', { type: ['Drama'] })).toBe('thin')
    expect(fieldQuality('type', '', { type: ['Drama', 'Romance'] })).toBe('solid')
    expect(fieldQuality('ships', '', { ships: ['Ada/Bea'] })).toBe('thin')
    expect(fieldQuality('ships', '', { ships: ['Ada/Bea', 'Ada & Cal'] })).toBe('solid')
  })

  it('sends solid fields to suggestions and thin or empty fields to complete', () => {
    const meta = { type: ['Drama', 'Romance'], rating: 'teen', isFanfic: false }
    expect(completeFields('basics', '', meta)).toEqual([])
    expect(suggestFields('basics', '', meta)).toEqual(['rating', 'type', 'isFanfic'])
    expect(completeFields('basics', '', { type: ['Drama'] })).toEqual(['rating', 'type', 'isFanfic'])
  })
})
