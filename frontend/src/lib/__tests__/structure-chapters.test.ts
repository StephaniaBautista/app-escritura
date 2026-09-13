import { describe, expect, it } from 'vitest'
import { countUnlinkedChapters, findCardByChapterId, linkedChapterIds, resolveColumnForPhase } from '../structure-chapters'
import type { StructureBoard } from '@/types/structure'

const board: StructureBoard = {
  id: 'board-1',
  projectId: 'proj-1',
  name: 'Estructura',
  order: 0,
  createdAt: '',
  updatedAt: '',
  columns: [
    {
      id: 'col-1', boardId: 'board-1', name: 'Inicio', color: null, order: 0, createdAt: '', updatedAt: '',
      cards: [{ id: 'card-1', columnId: 'col-1', title: 'Cap 1', description: null, cardType: 'chapter', referenceId: 'ch-1', color: null, order: 0, createdAt: '', updatedAt: '' }],
    },
    { id: 'col-2', boardId: 'board-1', name: 'Desarrollo', color: null, order: 1, createdAt: '', updatedAt: '', cards: [] },
    { id: 'col-3', boardId: 'board-1', name: 'Climax', color: null, order: 2, createdAt: '', updatedAt: '', cards: [] },
    { id: 'col-4', boardId: 'board-1', name: 'Conclusión', color: null, order: 3, createdAt: '', updatedAt: '', cards: [] },
  ],
}

describe('structure-chapters helpers', () => {
  it('resolves columns by Spanish name and by index fallback', () => {
    expect(resolveColumnForPhase(board.columns ?? [], 'beginning')?.id).toBe('col-1')
    expect(resolveColumnForPhase(board.columns ?? [], 'development')?.id).toBe('col-2')
    expect(resolveColumnForPhase([{ ...board.columns![0], name: 'Act I' }], 'beginning')?.name).toBe('Act I')
  })

  it('finds linked chapter cards and counts pending chapters', () => {
    expect(findCardByChapterId(board, 'ch-1')?.id).toBe('card-1')
    expect(linkedChapterIds(board)).toEqual(new Set(['ch-1']))
    expect(countUnlinkedChapters(board, ['ch-1', 'ch-2'])).toBe(1)
  })
})
