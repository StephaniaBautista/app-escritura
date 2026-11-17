import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BoardColumn } from '../BoardColumn'
import { useStructureStore } from '@/stores/structure-store'
import type { StructureCard, StructureColumn, Subplot } from '@/types/structure'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }))

function card(id: string, subplotId: string | null, order: number): StructureCard {
  return { id, columnId: 'col-1', title: `Card ${id}`, description: null, cardType: 'scene', referenceId: null, color: null, subplotId, order, createdAt: '', updatedAt: '' }
}

const romance: Subplot = { id: 'sub-1', projectId: 'project-1', title: 'Romance', description: null, status: 'active', color: '#aa3366', order: 0, createdAt: '', updatedAt: '' }

const column: StructureColumn = {
  id: 'col-1', boardId: 'board-1', name: 'Inicio', color: null, order: 0, createdAt: '', updatedAt: '',
  cards: [card('a', null, 0), card('b', 'sub-1', 1), card('c', null, 2)],
}

function renderColumn() {
  return render(
    <DndContext>
      <BoardColumn column={column} onAddCard={vi.fn()} onEditCard={vi.fn()} onRenameColumn={vi.fn()} onDeleteColumn={vi.fn()} />
    </DndContext>,
  )
}

beforeEach(() => {
  useStructureStore.setState({ subplots: [romance], hiddenSubplotIds: [] })
})

describe('BoardColumn subplot layer cards', () => {
  it('renders subplot cards tinted and interleaved with main-plot cards, with the subplot pill and color', () => {
    renderColumn()
    const ids = screen.getAllByTestId(/board-card-/).map((el) => el.getAttribute('data-testid'))
    expect(ids).toEqual(['board-card-a', 'board-card-b', 'board-card-c'])
    const layer = screen.getByTestId('board-card-b')
    expect(layer).toHaveAttribute('data-subplot-layer', 'true')
    expect(layer.className).toContain('subplot-layer-card')
    expect(layer.style.getPropertyValue('--subplot-color')).toBe('#aa3366')
    expect(screen.getByText('Romance')).toBeInTheDocument()
    expect(screen.getByTestId('board-card-a')).not.toHaveAttribute('data-subplot-layer')
  })

  it('hides subplot cards whose subplot is hidden while keeping the data', () => {
    useStructureStore.setState({ hiddenSubplotIds: ['sub-1'] })
    renderColumn()
    expect(screen.queryByTestId('board-card-b')).toBeNull()
    expect(screen.getByTestId('board-card-a')).toBeInTheDocument()
    expect(screen.getByTestId('board-card-c')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(column.cards).toHaveLength(3)
  })

  it('falls back to the violet token when the subplot is unknown', () => {
    useStructureStore.setState({ subplots: [] })
    renderColumn()
    expect(screen.getByTestId('board-card-b').style.getPropertyValue('--subplot-color')).toBe('var(--color-accent-violet)')
  })
})
