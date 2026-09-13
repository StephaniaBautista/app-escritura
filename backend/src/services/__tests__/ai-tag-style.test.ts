import { describe, expect, it } from 'vitest'
import { mergeUniqueTags, TAG_STYLE_MARKER, tagStyleGuidance } from '../ai-tag-style.js'

describe('AO3-style tag guidance', () => {
  it('includes folksonomy examples and generative patterns in both locales', () => {
    const es = tagStyleGuidance('es')
    const en = tagStyleGuidance('en')
    expect(es).toContain(TAG_STYLE_MARKER)
    expect(es).toContain('Dead Dove: Do Not Eat')
    expect(es).toContain('Uso indebido de X')
    expect(es).toContain('Hurt/Comfort')
    expect(en).toContain('Misuse of X')
    expect(en).toContain('Slow Burn')
  })

  it('merges tags without duplicating case-insensitive values', () => {
    expect(mergeUniqueTags(['Angst', '  '], ['angst', 'Slow Burn', 'Slow Burn'])).toEqual(['Angst', 'Slow Burn'])
  })
})
