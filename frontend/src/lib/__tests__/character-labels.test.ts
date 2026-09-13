import { describe, expect, it } from 'vitest'
import { characterOptionLabel, type CharacterLabelRef } from '../character-labels'

const t = (key: string, options?: { name: string }) => (
  key === 'characterApp.relEvolutionOf' && options?.name
    ? `evolución de ${options.name}`
    : key
)

const original: CharacterLabelRef = { id: 'v1', name: 'Alicia', evolvesFromId: null }
const evolved: CharacterLabelRef = { id: 'v2', name: 'Alicia', evolvesFromId: 'v1' }
const renamed: CharacterLabelRef = { id: 'v3', name: 'Alicia Reina', evolvesFromId: 'v1' }
const unique: CharacterLabelRef = { id: 'will', name: 'Will', evolvesFromId: null }

describe('characterOptionLabel', () => {
  it('marca la evolución aunque comparta nombre', () => {
    expect(characterOptionLabel(evolved, [original, evolved], t)).toBe('Alicia (evolución de Alicia)')
  })

  it('marca el original cuando hay otra ficha con el mismo nombre', () => {
    expect(characterOptionLabel(original, [original, evolved], t)).toBe('Alicia (characterApp.relVersionOriginal)')
  })

  it('deja el nombre único sin sufijo', () => {
    expect(characterOptionLabel(unique, [original, unique], t)).toBe('Will')
  })

  it('marca una evolución con nombre distinto', () => {
    expect(characterOptionLabel(renamed, [original, renamed], t)).toBe('Alicia Reina (evolución de Alicia)')
  })
})
