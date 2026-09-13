import { describe, expect, it } from 'vitest'
import { characterFillGaps } from '../ai-character-eligibility.js'

describe('character AI eligibility', () => {
  it('treats an empty sheet as incomplete', () => {
    const gaps = characterFillGaps({})
    expect(gaps).toContain('name')
    expect(gaps).toContain('description')
    expect(gaps).toContain('attributes.motivations')
  })

  it('omits filled fields including nested attributes', () => {
    expect(characterFillGaps({
      name: 'Ada',
      description: 'Vive en Madrid.',
      age: '30',
      gender: 'mujer',
      orientation: 'Heterosexual',
      species: 'humana',
      birthPlace: 'Madrid',
      role: 'protagonista',
      attributes: { motivations: 'volver', weaknesses: 'miedo', internalConflict: 'duda', personality: 'seca', virtues: 'lealtad', flaws: 'orgullo', jobStudies: 'archivo', clothing: 'abrigo', skills: 'lectura', health: 'asma', hobbies: 'te', extraData: 'gato' },
    }, false)).toEqual([])
  })

  it('asks for orientation when the sheet leaves it blank', () => {
    expect(characterFillGaps({ name: 'Ada' }, false)).toContain('orientation')
    expect(characterFillGaps({ name: 'Ada', orientation: 'Bisexual' }, false)).not.toContain('orientation')
  })

  it('keeps name off the gap list when completing an existing character', () => {
    expect(characterFillGaps({ name: 'Ada' }, false)).not.toContain('name')
    expect(characterFillGaps({ name: 'Ada' }, false)).toContain('description')
  })
})
