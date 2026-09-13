import { describe, expect, it } from 'vitest'
import { assignWizardActions, parseTagSuggestions, parseWizardFill, parseWizardStage, wizardMetaPatch } from '../ai-wizard-parse.js'

describe('parseWizardFill structure answers', () => {
  it('keeps question answers and chapter/note scenes from evidence-shaped JSON', () => {
    const fill = parseWizardFill(JSON.stringify({
      structure: {
        sections: [
          {
            id: 'desarrollo',
            answers: {
              'wizard:desarrollo:inciting': 'La noticia se filtra.',
              'unknown': 'skip',
            },
            scenes: [
              { title: 'La noticia se filtra', form: 'chapter' },
              { title: 'Cómo se enteran', form: 'note' },
            ],
          },
        ],
      },
    }), ['structure'])

    expect(fill.structure?.sections[0]).toMatchObject({
      id: 'desarrollo',
      answers: { 'wizard:desarrollo:inciting': 'La noticia se filtra.' },
      scenes: [
        { title: 'La noticia se filtra', form: 'chapter' },
        { title: 'Cómo se enteran', form: 'note' },
      ],
    })
  })

  it('copies scenes into the desarrollo scenes answer when the model omitted it', () => {
    const fill = parseWizardFill(JSON.stringify({
      structure: {
        sections: [{
          id: 'desarrollo',
          scenes: [{ title: 'El llamado', form: 'chapter' }],
        }],
      },
    }), ['structure'])
    const patch = wizardMetaPatch(fill)
    const sections = (patch.structure as { sections: { answers?: Record<string, string> }[] }).sections
    expect(sections[0]?.answers?.['wizard:desarrollo:scenes']).toBe('capítulo: El llamado')
  })

  it('rejects constructor keys in answers', () => {
    expect(() => parseWizardFill('{"structure":{"sections":[{"id":"inicio","answers":{"constructor":"x"}}]}}', ['structure'])).toThrow('AI_INVALID_RESPONSE')
  })
})

describe('parseWizardStage', () => {
  it('keeps type and ships in a stage payload', () => {
    const parsed = parseWizardStage(JSON.stringify({
      complete: { type: ['Romance'], ships: ['Ada/Bea'] },
      suggestions: [{ field: 'type', title: 'Más géneros', description: 'El texto también es drama.', value: ['Romance', 'Drama'] }],
    }), ['type', 'ships'])
    expect(parsed.fill).toEqual({ type: ['Romance'], ships: ['Ada/Bea'] })
    expect(parsed.suggestions[0]).toMatchObject({ field: 'type', value: ['Romance', 'Drama'] })
  })

  it('accepts the LLM shapes that were rejected as expected_object', () => {
    const fromArray = parseWizardStage(JSON.stringify({
      complete: [{ type: ['Romance'] }, { field: 'ships', value: ['Ada/Bea'] }],
    }), ['type', 'ships'])
    expect(fromArray.fill).toEqual({ type: ['Romance'], ships: ['Ada/Bea'] })
    const fromNull = parseWizardStage(JSON.stringify({
      complete: null,
      suggestions: { field: 'type', title: 'Más géneros', description: 'También es drama.', value: 'Romance, Drama' },
    }), ['type'])
    expect(fromNull.fill).toEqual({})
    expect(fromNull.suggestions[0]).toMatchObject({ field: 'type', value: ['Romance', 'Drama'] })
  })

  it('moves a solid field out of complete and promotes an empty-field suggestion', () => {
    const assigned = assignWizardActions(
      { type: ['Romance', 'Drama'] },
      [{ field: 'ships', title: 'Pareja', description: 'Están juntas.', value: ['Ada/Bea'] }],
      ['ships'],
      ['type'],
    )
    expect(assigned.fill).toEqual({ ships: ['Ada/Bea'] })
    expect(assigned.suggestions).toEqual([
      { field: 'type', title: 'type', description: '', value: ['Romance', 'Drama'] },
    ])
  })
})

describe('parseTagSuggestions', () => {
  it('accepts inferred tags within the wizard list limits', () => {
    expect(parseTagSuggestions(JSON.stringify({ tags: ['Dead Dove: Do Not Eat', 'Hurt/Comfort'] }))).toEqual([
      'Dead Dove: Do Not Eat', 'Hurt/Comfort',
    ])
  })

  it('rejects more than eight tags or overlong labels', () => {
    expect(() => parseTagSuggestions(JSON.stringify({ tags: Array.from({ length: 9 }, (_, i) => `t${i}`) }))).toThrow('AI_INVALID_RESPONSE')
    expect(() => parseTagSuggestions(JSON.stringify({ tags: ['x'.repeat(81)] }))).toThrow('AI_INVALID_RESPONSE')
  })
})
