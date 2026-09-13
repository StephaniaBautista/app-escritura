import { describe, expect, it } from 'vitest'
import { applyCharacterFill, fillToDraft, fillToInput, uniqueNewFills } from '../character-ai'
import { emptyDraft } from '../CharacterFormFields'

describe('character AI fill apply', () => {
  it('fills only empty draft fields', () => {
    const draft = emptyDraft()
    draft.name = 'Ada'
    draft.description = 'Ya escrito.'
    const next = applyCharacterFill(draft, {
      name: 'Otra',
      description: 'Inventado',
      age: 'treinta',
      attributes: { motivations: 'volver' },
    })
    expect(next.name).toBe('Ada')
    expect(next.description).toBe('Ya escrito.')
    expect(next.age).toBe('treinta')
    expect(next.attributes.motivations).toBe('volver')
    expect(draft.age).toBe('')
  })

  it('builds a create draft from a fill', () => {
    expect(fillToDraft({ name: 'Ada', role: 'protagonista', isOC: true }).name).toBe('Ada')
    expect(fillToDraft({ name: 'Ada', role: 'protagonista', isOC: true }).role).toBe('protagonista')
    expect(fillToDraft({ name: 'Ada', role: 'protagonista', isOC: true }).isOC).toBe(true)
  })

  it('applies orientation to empty drafts and create input', () => {
    expect(applyCharacterFill(emptyDraft(), { name: 'Ada', orientation: 'Homosexual' }).orientation).toBe('Homosexual')
    expect(fillToInput({ name: 'Ada', orientation: 'Bisexual' }).orientation).toBe('Bisexual')
  })

  it('drops duplicate or already stored names before a batch create', () => {
    expect(uniqueNewFills(
      [{ name: 'Ada' }, { name: 'ada' }, { name: 'Nico' }, { name: 'Mara' }],
      ['Mara'],
    ).map((fill) => fill.name)).toEqual(['Ada', 'Nico'])
  })
})
