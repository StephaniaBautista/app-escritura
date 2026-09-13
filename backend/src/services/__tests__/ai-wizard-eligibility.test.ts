import { describe, expect, it } from 'vitest'
import { assertManuscriptEligible, isWizardIncomplete, minWordsForGaps, wizardGaps } from '../ai-wizard-eligibility.js'

const filledStructure = {
  sections: [
    { id: 'inicio', answers: { 'wizard:inicio:status': 'mundo', 'wizard:inicio:crack': 'grieta' } },
    {
      id: 'desarrollo',
      answers: {
        'wizard:desarrollo:inciting': 'incidente',
        'wizard:desarrollo:effect': 'efecto',
        'wizard:desarrollo:scenes': 'escenas',
      },
    },
    { id: 'climax', answers: { 'wizard:climax:peak': 'pico', 'wizard:climax:now': 'ahora' } },
    { id: 'final', answers: { 'wizard:final:arrive': 'llega', 'wizard:final:change': 'cambia' } },
  ],
}

const filled = {
  rating: 'teen',
  type: ['Drama'],
  isFanfic: false,
  characters: [{ name: 'Ada' }],
  tags: ['intriga'],
  narrator: 'tercera',
  ending: 'abierto',
  worldContext: 'ciudad',
  initialSituation: 'llega',
  centralTheme: 'memoria',
  problems: 'olvido',
  protagonistLife: 'calma',
  protagonistEvolution: 'acepta',
  structure: filledStructure,
}

describe('wizard AI eligibility', () => {
  it('treats an empty project as incomplete', () => {
    expect(isWizardIncomplete(null, {})).toBe(true)
    expect(wizardGaps(null, {})).toContain('description')
    expect(wizardGaps(null, {})).toContain('structure')
  })

  it('hides generation when core story info and structure are filled', () => {
    expect(isWizardIncomplete('Una historia sobre Ada.', filled)).toBe(false)
    expect(wizardGaps('Una historia sobre Ada.', filled)).toEqual([])
  })

  it('stays incomplete after a first fill that only wrote structure prose', () => {
    const afterFirstFill = {
      ...filled,
      structure: { sections: [{ id: 'inicio', content: 'Ada llega de noche.' }] },
    }
    expect(isWizardIncomplete('Una historia sobre Ada.', afterFirstFill)).toBe(true)
    expect(wizardGaps('Una historia sobre Ada.', afterFirstFill)).toEqual(['structure'])
  })

  it('requires fandoms only for fanfic and ships for romance', () => {
    expect(wizardGaps('desc', { ...filled, isFanfic: true })).toContain('fandoms')
    expect(wizardGaps('desc', { ...filled, type: ['Romance'] })).toContain('ships')
    expect(wizardGaps('desc', filled)).not.toContain('fandoms')
    expect(wizardGaps('desc', filled)).not.toContain('ships')
  })

  it('scales the document-word floor with remaining gaps and caps the requirement', () => {
    expect(minWordsForGaps(1)).toBe(80)
    expect(minWordsForGaps(4)).toBe(100)
    expect(minWordsForGaps(20)).toBe(200)
  })

  it('rejects empty and short manuscripts with the wizard codes', () => {
    expect(() => assertManuscriptEligible(0, 4)).toThrow()
    try {
      assertManuscriptEligible(0, 4)
    } catch (error) {
      expect(error).toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    }
    try {
      assertManuscriptEligible(12, 4)
    } catch (error) {
      expect(error).toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT', statusCode: 422 })
    }
    expect(() => assertManuscriptEligible(100, 4)).not.toThrow()
  })
})
