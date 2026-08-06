import { describe, it, expect } from 'vitest'
import { getDocumentTabs, getDocumentRootId, getNextTabTitle, getFirstTabId } from '../document-tabs'
import type { DocumentNode } from '@/types/document'

const makeDoc = (id: string, parentId: string | null, order = 0): DocumentNode => ({
  id,
  title: id,
  type: parentId ? 'subpage' : 'document',
  parentId,
  order,
  updatedAt: '2026-08-01T00:00:00.000Z',
})

describe('getDocumentTabs', () => {
  const tree: DocumentNode[] = [
    makeDoc('A', null, 0),
    makeDoc('A.1', 'A', 0),
    makeDoc('A.2', 'A', 1),
    makeDoc('B', null, 1),
    makeDoc('B.1', 'B', 0),
    makeDoc('C', null, 2),
  ]

  it('no muestra nada cuando no hay documento activo', () => {
    expect(getDocumentTabs(tree, null)).toEqual([])
  })

  it('documento padre sin subpestañas → panel vacío (el padre no se muestra)', () => {
    expect(getDocumentTabs(tree, 'C')).toEqual([])
  })

  it('documento padre con subpestañas → solo las subpestañas, nunca el padre', () => {
    const result = getDocumentTabs(tree, 'A')
    expect(result.map((d) => d.id)).toEqual(['A.1', 'A.2'])
  })

  it('subpágina activa → sube al documento padre y muestra todas sus subpestañas (sin el padre)', () => {
    const result = getDocumentTabs(tree, 'A.2')
    expect(result.map((d) => d.id)).toEqual(['A.1', 'A.2'])
  })

  it('aísla documentos: activo en B no muestra subpestañas de A ni C', () => {
    const result = getDocumentTabs(tree, 'B.1')
    expect(result.map((d) => d.id)).toEqual(['B.1'])
  })

  it('devuelve vacío si el documento activo no existe (fallback seguro, nunca mezcla)', () => {
    expect(getDocumentTabs(tree, 'no-existe')).toEqual([])
  })

  it('maneja árbol vacío', () => {
    expect(getDocumentTabs([], 'A')).toEqual([])
  })

  it('maneja profundidad anidada (subpágina de subpágina) bajo el mismo padre', () => {
    const deep: DocumentNode[] = [
      makeDoc('X', null, 0),
      makeDoc('X.1', 'X', 0),
      makeDoc('X.1.1', 'X.1', 0),
      makeDoc('Y', null, 1),
    ]
    const result = getDocumentTabs(deep, 'X.1.1')
    expect(result.map((d) => d.id)).toEqual(['X.1', 'X.1.1'])
  })

  it('no se cuelga con ciclos corruptos en parentId', () => {
    const cyclic: DocumentNode[] = [
      { ...makeDoc('P', null, 0), parentId: 'Q' },
      { ...makeDoc('Q', null, 1), parentId: 'P' },
    ]
    const result = getDocumentTabs(cyclic, 'P')
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('getDocumentRootId', () => {
  const tree: DocumentNode[] = [
    makeDoc('A', null, 0),
    makeDoc('A.1', 'A', 0),
    makeDoc('A.1.1', 'A.1', 0),
    makeDoc('B', null, 1),
  ]

  it('devuelve el id del documento raíz de una subpágina profunda', () => {
    expect(getDocumentRootId(tree, 'A.1.1')).toBe('A')
  })

  it('devuelve el propio id cuando el documento ya es raíz', () => {
    expect(getDocumentRootId(tree, 'B')).toBe('B')
  })

  it('devuelve null si el documento no existe', () => {
    expect(getDocumentRootId(tree, 'zzz')).toBeNull()
  })
})

describe('getNextTabTitle', () => {
  const tree: DocumentNode[] = [
    makeDoc('A', null, 0),
    makeDoc('A.1', 'A', 0),
    makeDoc('A.2', 'A', 1),
    makeDoc('B', null, 1),
  ]

  it('primera pestaña del documento → "Pestaña 1"', () => {
    expect(getNextTabTitle(tree, 'B', 'Pestaña')).toBe('Pestaña 1')
  })

  it('con 2 pestañas existentes → "Pestaña 3"', () => {
    expect(getNextTabTitle(tree, 'A', 'Pestaña')).toBe('Pestaña 3')
  })

  it('no cuenta pestañas de otros documentos', () => {
    expect(getNextTabTitle(tree, 'B', 'Pestaña')).toBe('Pestaña 1')
  })

  it('respeta el prefijo i18n', () => {
    expect(getNextTabTitle(tree, 'B', 'Tab')).toBe('Tab 1')
  })
})

describe('getFirstTabId', () => {
  const tree: DocumentNode[] = [
    makeDoc('A', null, 0),
    makeDoc('A.1', 'A', 0),
    makeDoc('A.2', 'A', 1),
    makeDoc('A.2.1', 'A.2', 0),
    makeDoc('B', null, 1),
  ]

  it('devuelve la primera pestaña (primer descendiente en orden) del documento', () => {
    expect(getFirstTabId(tree, 'A')).toBe('A.1')
  })

  it('devuelve null si el documento no tiene pestañas', () => {
    expect(getFirstTabId(tree, 'B')).toBeNull()
  })

  it('devuelve null si el documento no existe', () => {
    expect(getFirstTabId(tree, 'no-existe')).toBeNull()
  })

  it('subpágina activa → primera pestaña de su documento raíz', () => {
    expect(getFirstTabId(tree, 'A.2.1')).toBe('A.1')
  })

  it('maneja árbol vacío', () => {
    expect(getFirstTabId([], 'A')).toBeNull()
  })
})