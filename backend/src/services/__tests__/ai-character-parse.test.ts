import { describe, expect, it } from 'vitest'
import { characterHasEvidence, parseCharacterFill } from '../ai-character-parse.js'
import { AiServiceError } from '../ai-types.js'

describe('character fill parse', () => {
  it('keeps only allowed keys and drops empty evidence', () => {
    const fills = parseCharacterFill(JSON.stringify({
      characters: [{ name: 'Ada', description: 'Vive en Madrid.', age: 'treinta', attributes: { motivations: 'volver' } }],
    }), ['name', 'description', 'age', 'attributes.motivations'])
    expect(fills).toEqual([{
      name: 'Ada', description: 'Vive en Madrid.', age: 'treinta', attributes: { motivations: 'volver' },
    }])
    expect(characterHasEvidence(fills[0]!, ['description'])).toBe(true)
  })

  it('rejects unknown fields and prototype keys', () => {
    expect(() => parseCharacterFill(JSON.stringify({ characters: [{ name: 'Ada', imageUrl: 'x' }] }), ['name'])).toThrow(AiServiceError)
    expect(() => parseCharacterFill('{"characters":[{"name":"Ada","attributes":{"__proto__":{"x":"hack"}}}]}', ['attributes.motivations'])).toThrow(AiServiceError)
  })

  it('normalizes sexual orientation aliases to catalog values', () => {
    const fills = parseCharacterFill(JSON.stringify({
      characters: [{ name: 'Ada', orientation: 'lesbiana' }, { name: 'Nico', orientation: 'gay' }],
    }), ['name', 'orientation'])
    expect(fills[0]?.orientation).toBe('Homosexual')
    expect(fills[1]?.orientation).toBe('Homosexual')
  })

  it('drops orientation that cannot be mapped to the catalog', () => {
    const fills = parseCharacterFill(JSON.stringify({
      characters: [{ name: 'Ada', orientation: 'misteriosa' }],
    }), ['name', 'orientation'])
    expect(fills[0]).toEqual({ name: 'Ada' })
  })

  it('omits attributes outside remaining gaps', () => {
    const fills = parseCharacterFill(JSON.stringify({
      characters: [{ name: 'Ada', age: '30', attributes: { motivations: 'volver', hobbies: 'té' } }],
    }), ['age', 'attributes.motivations'])
    expect(fills[0]).toEqual({ name: 'Ada', age: '30', attributes: { motivations: 'volver' } })
  })
})
