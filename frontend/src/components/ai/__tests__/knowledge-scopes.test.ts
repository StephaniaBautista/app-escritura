import { describe, expect, it } from 'vitest'
import { knowledgeScopes } from '../knowledge-scopes'

const page = (id: string, type: 'document' | 'chapter' | 'subpage', parentId: string | null) => ({ id, title: id, type, parentId })

describe('knowledgeScopes', () => {
  it('lists chapters and subpages in reading order with their nesting level', () => {
    const pages = [
      page('root', 'document', null),
      page('chapter-1', 'chapter', 'root'),
      page('page-1', 'subpage', 'chapter-1'),
      page('chapter-2', 'chapter', 'root'),
      page('page-2', 'subpage', 'chapter-2'),
      page('deep', 'subpage', 'page-2'),
    ]

    expect(knowledgeScopes(pages)).toEqual([
      { id: 'chapter-1', title: 'chapter-1', type: 'chapter', depth: 0 },
      { id: 'page-1', title: 'page-1', type: 'subpage', depth: 1 },
      { id: 'chapter-2', title: 'chapter-2', type: 'chapter', depth: 0 },
      { id: 'page-2', title: 'page-2', type: 'subpage', depth: 1 },
      { id: 'deep', title: 'deep', type: 'subpage', depth: 2 },
    ])
  })

  it('excludes the manuscript root and any other root document', () => {
    const pages = [page('root', 'document', null), page('chapter-1', 'chapter', 'root'), page('other', 'document', null)]

    expect(knowledgeScopes(pages).map((scope) => scope.id)).toEqual(['chapter-1'])
  })

  it('keeps scopes whose manuscript root is missing, without duplicates', () => {
    const pages = [page('chapter-1', 'chapter', 'missing-root'), page('chapter-2', 'chapter', 'missing-root')]

    expect(knowledgeScopes(pages).map((scope) => scope.id)).toEqual(['chapter-1', 'chapter-2'])
  })

  it('returns nothing when the project has no chapters yet', () => {
    expect(knowledgeScopes([page('root', 'document', null)])).toEqual([])
    expect(knowledgeScopes([])).toEqual([])
  })
})
