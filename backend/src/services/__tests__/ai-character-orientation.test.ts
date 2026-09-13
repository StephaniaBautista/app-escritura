import { describe, expect, it } from 'vitest'
import { normalizeOrientation, orientationCatalog } from '../ai-character-orientation.js'

describe('character orientation normalize', () => {
  it('maps named and implied aliases onto catalog values', () => {
    expect(normalizeOrientation('Heterosexual')).toBe('Heterosexual')
    expect(normalizeOrientation('straight')).toBe('Heterosexual')
    expect(normalizeOrientation('Lesbiana')).toBe('Homosexual')
    expect(normalizeOrientation('GAY')).toBe('Homosexual')
    expect(normalizeOrientation('bi')).toBe('Bisexual')
    expect(normalizeOrientation('pansexual')).toBe('Pansexual')
    expect(normalizeOrientation('ace')).toBe('Asexual')
  })

  it('uses custom catalog labels when they match', () => {
    expect(normalizeOrientation('gay', ['Lesbiana', 'Gay'])).toBe('Gay')
    expect(normalizeOrientation('desconocida', ['Heterosexual'])).toBeNull()
  })

  it('falls back to defaults when the catalog is empty', () => {
    expect(orientationCatalog([])).toEqual(['Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual'])
  })
})
