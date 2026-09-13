import { describe, expect, it } from 'vitest'
import type { DocumentNode } from '@/types/document'
import { flattenRelatedDocuments, relatedDocumentTitle } from '../timeline-related-points'

const node = (
  id: string,
  title: string,
  parentId: string | null,
  order: number,
  type: DocumentNode['type'] = parentId ? 'subpage' : 'document',
): DocumentNode => ({
  id,
  title,
  type,
  parentId,
  order,
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('flattenRelatedDocuments', () => {
  it('lists root docs and nested subpages with path titles', () => {
    const tree = [
      node('doc-b', 'Bestiario', null, 1),
      node('doc-a', 'Novela', null, 0),
      node('ch-2', 'Capítulo 2', 'doc-a', 1, 'chapter'),
      node('ch-1', 'Capítulo 1', 'doc-a', 0, 'chapter'),
      node('sc-1', 'Escena', 'ch-1', 0),
      node('tab-b', 'Razas', 'doc-b', 0, 'chapter'),
    ]
    expect(flattenRelatedDocuments(tree).map((n) => n.id)).toEqual([
      'doc-a',
      'ch-1',
      'sc-1',
      'ch-2',
      'doc-b',
      'tab-b',
    ])
    expect(flattenRelatedDocuments(tree).map((n) => n.name)).toEqual([
      'Novela',
      'Novela / Capítulo 1',
      'Novela / Capítulo 1 / Escena',
      'Novela / Capítulo 2',
      'Bestiario',
      'Bestiario / Razas',
    ])
  })

  it('returns empty when there are no documents', () => {
    expect(flattenRelatedDocuments([])).toEqual([])
  })

  it('does not hang on parent cycles', () => {
    const cyclic = [
      { ...node('p', 'P', 'q', 0), parentId: 'q' },
      { ...node('q', 'Q', 'p', 1), parentId: 'p' },
    ]
    const result = flattenRelatedDocuments(cyclic)
    expect(result.map((n) => n.id).sort()).toEqual(['p', 'q'])
  })

  it('includes orphans whose parent is missing', () => {
    const tree = [node('orphan', 'Huérfana', 'missing', 0, 'subpage')]
    expect(flattenRelatedDocuments(tree)).toEqual([
      { id: 'orphan', name: 'Huérfana', type: 'subpage' },
    ])
  })
})

describe('relatedDocumentTitle', () => {
  it('resolves a flattened path or falls back', () => {
    const options = flattenRelatedDocuments([
      node('doc-a', 'Novela', null, 0),
      node('ch-1', 'Capítulo 1', 'doc-a', 0, 'chapter'),
    ])
    expect(relatedDocumentTitle(options, 'ch-1', '—')).toBe('Novela / Capítulo 1')
    expect(relatedDocumentTitle(options, 'gone', '—')).toBe('—')
  })
})
