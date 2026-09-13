import { describe, it, expect } from 'vitest'
import { migrateStructure, isStandardSection, sectionLabelKey, storyMetaSections } from '../story-structure'

describe('migrateStructure', () => {
  it('devuelve estructura vacía si no hay datos', () => {
    expect(migrateStructure(undefined)).toEqual({ sections: [] })
    expect(migrateStructure(null)).toEqual({ sections: [] })
  })

  it('migra el formato legacy { inicio, desarrollo, climax, final }', () => {
    const result = migrateStructure({
      inicio: 'Primera escena',
      desarrollo: 'Conflicto',
      final: 'Cierre',
    })
    expect(result.sections).toEqual([
      { id: 'inicio', content: 'Primera escena' },
      { id: 'desarrollo', content: 'Conflicto' },
      { id: 'final', content: 'Cierre' },
    ])
  })

  it('ignora campos legacy vacíos', () => {
    const result = migrateStructure({ inicio: '  ', climax: 'Cúspide' })
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].id).toBe('climax')
  })

  it('respeta el formato nuevo con secciones y plantilla', () => {
    const result = migrateStructure({
      templateId: 't-1',
      sections: [
        { id: 'inicio', content: 'A', answers: { 'q-1': 'respuesta' } },
        { id: 'epilogo', title: 'Epílogo', content: 'B' },
      ],
    })
    expect(result.templateId).toBe('t-1')
    expect(result.sections[0].answers).toEqual({ 'q-1': 'respuesta' })
    expect(result.sections[0].scenes).toBeUndefined()
    expect(result.sections[1].title).toBe('Epílogo')
  })

  it('conserva escenas sugeridas como capítulo o nota', () => {
    const result = migrateStructure({
      sections: [{
        id: 'desarrollo',
        content: '',
        scenes: [
          { title: 'La noticia', form: 'chapter' },
          { title: 'Vecinos', form: 'note' },
          { title: 'Ignorar', form: 'other' },
        ],
      }],
    })
    expect(result.sections[0].scenes).toEqual([
      { title: 'La noticia', form: 'chapter' },
      { title: 'Vecinos', form: 'note' },
    ])
  })

  it('descarta secciones inválidas del formato nuevo', () => {
    const result = migrateStructure({ sections: [{ content: 'sin id' }, 'basura', { id: 42 }] })
    expect(result.sections).toEqual([])
  })
})

describe('isStandardSection / sectionLabelKey', () => {
  it('reconoce secciones estándar y su clave i18n', () => {
    expect(isStandardSection('inicio')).toBe(true)
    expect(isStandardSection('final')).toBe(true)
    expect(isStandardSection('epilogo')).toBe(false)
    expect(sectionLabelKey('inicio')).toBe('storySetup.structureInicio')
    expect(sectionLabelKey('epilogo')).toBe('')
  })
})

describe('storyMetaSections', () => {
  it('extrae las secciones del storyMeta (con migración legacy)', () => {
    expect(storyMetaSections({ structure: { inicio: 'Hola' } as never })).toEqual([{ id: 'inicio', content: 'Hola' }])
    expect(storyMetaSections({})).toEqual([])
  })
})
