import { describe, expect, it } from 'vitest'
import { hasLocalWrittenDocuments, isWizardIncomplete, wizardGaps } from '../wizard-ai'
import type { Document } from '@/types/document'
import type { StoryMeta } from '@/types/story'

const completeStructure: StoryMeta['structure'] = {
  sections: [
    { id: 'inicio', title: 'Inicio', answers: { 'wizard:inicio:status': 'mundo', 'wizard:inicio:crack': 'grieta' } },
    {
      id: 'desarrollo',
      title: 'Desarrollo',
      answers: {
        'wizard:desarrollo:inciting': 'incidente',
        'wizard:desarrollo:effect': 'efecto',
        'wizard:desarrollo:scenes': 'escenas',
      },
    },
    { id: 'climax', title: 'Clímax', answers: { 'wizard:climax:peak': 'pico', 'wizard:climax:now': 'ahora' } },
    { id: 'final', title: 'Final', answers: { 'wizard:final:arrive': 'llega', 'wizard:final:change': 'cambia' } },
  ],
}

const complete: StoryMeta = {
  rating: 'teen',
  type: ['Drama'],
  isFanfic: false,
  characters: [{ name: 'Ada', isOC: true }],
  tags: ['intriga'],
  narrator: 'tercera',
  ending: 'abierto',
  worldContext: 'ciudad',
  initialSituation: 'llega',
  centralTheme: 'memoria',
  problems: 'olvido',
  protagonistLife: 'calma',
  protagonistEvolution: 'acepta',
  structure: completeStructure,
}

describe('wizard AI eligibility', () => {
  it('marks empty wizard data as incomplete', () => {
    expect(isWizardIncomplete('', {})).toBe(true)
    expect(wizardGaps('', {})).toEqual(expect.arrayContaining(['description', 'rating', 'structure']))
  })

  it('marks a fully filled wizard as complete without hiding the generate action', () => {
    expect(isWizardIncomplete('Ada llega de noche a Madrid.', complete)).toBe(false)
  })

  it('stays incomplete after a first fill that only wrote structure prose', () => {
    const afterFirstFill: StoryMeta = {
      ...complete,
      structure: { sections: [{ id: 'inicio', title: 'Inicio', content: 'Ada llega de noche.' }] },
    }
    expect(isWizardIncomplete('Ada llega de noche a Madrid.', afterFirstFill)).toBe(true)
    expect(wizardGaps('Ada llega de noche a Madrid.', afterFirstFill)).toEqual(['structure'])
  })
})

describe('local written documents', () => {
  it('treats an empty tree without a current manuscript as having nothing written', () => {
    expect(hasLocalWrittenDocuments('p1', [], null)).toBe(false)
  })

  it('defers to the server when the project already has documents', () => {
    expect(hasLocalWrittenDocuments('p1', [{ id: 'd1', title: 'Cap', type: 'document', parentId: null, order: 0, updatedAt: '' }], null)).toBe(true)
  })

  it('counts visible TipTap text on the current project document', () => {
    const document = {
      id: 'd1', projectId: 'p1', title: 'Cap', type: 'document', parentId: null, order: 0,
      updatedAt: '', createdAt: '', folderId: null, userId: 'u1',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ada espera.' }] }] },
    } as Document
    expect(hasLocalWrittenDocuments('p1', [], document)).toBe(true)
    expect(hasLocalWrittenDocuments('other', [], document)).toBe(false)
  })
})
