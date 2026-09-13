import { describe, expect, it } from 'vitest'
import {
  allWizardStructurePromptsFilled,
  formatSceneSuggestions,
  hasStructurePromptAnswers,
  isStructurePromptId,
  parseSceneSuggestions,
  structurePromptLabelKey,
  structurePromptValue,
  structurePromptsFor,
} from '../structure-prompts'

describe('structurePromptsFor', () => {
  it('returns question prompts for the four standard sections', () => {
    expect(structurePromptsFor('inicio').map((prompt) => prompt.id)).toEqual([
      'wizard:inicio:status',
      'wizard:inicio:crack',
    ])
    expect(structurePromptsFor('desarrollo')).toHaveLength(3)
    expect(structurePromptsFor('climax')).toHaveLength(2)
    expect(structurePromptsFor('final').map((prompt) => prompt.id)).toEqual([
      'wizard:final:arrive',
      'wizard:final:change',
    ])
    expect(structurePromptsFor('epilogo')).toEqual([])
  })
})

describe('allWizardStructurePromptsFilled', () => {
  it('requires every wizard prompt, not a single content snippet', () => {
    expect(allWizardStructurePromptsFilled([{ id: 'inicio', content: 'Ada llega.' }])).toBe(false)
    expect(allWizardStructurePromptsFilled([
      { answers: { 'wizard:inicio:status': 'mundo', 'wizard:inicio:crack': 'grieta' } },
      {
        answers: {
          'wizard:desarrollo:inciting': 'incidente',
          'wizard:desarrollo:effect': 'efecto',
          'wizard:desarrollo:scenes': 'escenas',
        },
      },
      { answers: { 'wizard:climax:peak': 'pico', 'wizard:climax:now': 'ahora' } },
      { answers: { 'wizard:final:arrive': 'llega', 'wizard:final:change': 'cambia' } },
    ])).toBe(true)
  })
})

describe('structure prompt ids', () => {
  it('maps known ids to i18n keys and rejects unknown ones', () => {
    expect(isStructurePromptId('wizard:climax:now')).toBe(true)
    expect(isStructurePromptId('q-1')).toBe(false)
    expect(structurePromptLabelKey('wizard:final:change')).toBe('storySetup.structurePromptFinalChange')
    expect(structurePromptLabelKey('q-1')).toBeUndefined()
  })
})

describe('structurePromptValue', () => {
  it('falls back to legacy content on the first unanswered prompt', () => {
    const section = { id: 'inicio', content: 'Ada llega de noche.' }
    const [first, second] = structurePromptsFor('inicio')
    expect(structurePromptValue(section, first, 0)).toBe('Ada llega de noche.')
    expect(structurePromptValue(section, second, 1)).toBe('')
    expect(hasStructurePromptAnswers(section)).toBe(false)
  })

  it('prefers stored answers over legacy content', () => {
    const section = {
      id: 'inicio',
      content: 'legacy',
      answers: { 'wizard:inicio:status': 'Status quo' },
    }
    const [first] = structurePromptsFor('inicio')
    expect(structurePromptValue(section, first, 0)).toBe('Status quo')
    expect(hasStructurePromptAnswers(section)).toBe(true)
  })
})

describe('parseSceneSuggestions', () => {
  it('classifies chapter and note lines and ignores duplicates', () => {
    expect(
      parseSceneSuggestions('capítulo: La noticia se filtra\nnota: Cómo se enteran\nchapter: La noticia se filtra\nSin prefijo'),
    ).toEqual([
      { title: 'La noticia se filtra', form: 'chapter' },
      { title: 'Cómo se enteran', form: 'note' },
      { title: 'Sin prefijo', form: 'chapter' },
    ])
  })

  it('formats scenes for the writer locale', () => {
    const scenes = [
      { title: 'The leak', form: 'chapter' as const },
      { title: 'Neighborhood', form: 'note' as const },
    ]
    expect(formatSceneSuggestions(scenes, 'es')).toBe('capítulo: The leak\nnota: Neighborhood')
    expect(formatSceneSuggestions(scenes, 'en')).toBe('chapter: The leak\nnote: Neighborhood')
  })
})
