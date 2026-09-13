import { describe, expect, it } from 'vitest'
import { characterSuggestionPatch, characterFieldValue } from '../character-suggestions'
import { analysis, character, suggestion } from './fixtures'
import type { AiSuggestion } from '@/types/ai'

const completion: AiSuggestion = { ...suggestion, kind: 'character_completion', characterId: character.id, field: 'attributes.motivations', value: 'Volver al hogar' }

describe('character extraction acceptance', () => {
  it('updates only the accepted field and preserves other attributes', () => {
    expect(characterSuggestionPatch(character, completion, analysis)).toEqual({ attributes: { hobbies: 'Lectura', motivations: 'Volver al hogar' } })
    expect(character.attributes).toEqual({ hobbies: 'Lectura' })
  })
  it('rejects a different character, forbidden fields, and missing evidence', () => {
    expect(characterSuggestionPatch(character, { ...completion, characterId: 'other' }, analysis)).toBeNull()
    expect(characterSuggestionPatch(character, { ...completion, field: 'imageUrl' }, analysis)).toBeNull()
    expect(characterSuggestionPatch(character, { ...completion, sourceIds: ['unknown'] }, analysis)).toBeNull()
    expect(characterSuggestionPatch(character, { ...completion, sourceIds: [] }, analysis)).toBeNull()
  })
  it('shows current values without exposing unrelated fields', () => {
    expect(characterFieldValue(character, 'attributes.hobbies')).toBe('Lectura')
    expect(characterFieldValue(character, 'projectId')).toBe('')
  })
})
