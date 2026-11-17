import { useTranslation } from 'react-i18next'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { StructureCard, StructureColumn } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { filterVisibleSubplotItems } from '@/lib/subplot-visibility'
import { BoardCard } from './BoardCard'

interface BoardColumnProps {
  column: StructureColumn
  onAddCard: (columnId: string) => void
  onEditCard: (card: StructureCard) => void
  onRenameColumn: (column: StructureColumn) => void
  onDeleteColumn: (column: StructureColumn) => void
}

export function BoardColumn({ column, onAddCard, onEditCard, onRenameColumn, onDeleteColumn }: BoardColumnProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  })
  const subplots = useStructureStore((state) => state.subplots)
  const hiddenSubplotIds = useStructureStore((state) => state.hiddenSubplotIds)
  const cards = filterVisibleSubplotItems(column.cards ?? [], hiddenSubplotIds)
  const subplotById = new Map(subplots.map((subplot) => [subplot.id, subplot]))

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: 'var(--color-background)',
        borderColor: 'var(--color-paper-lines)',
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex flex-col w-72 flex-shrink-0 rounded-xl border max-h-full"
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t('structureApp.dragColumn')}
          className="cursor-grab active:cursor-grabbing touch-none hover:opacity-70"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {column.color && (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        )}
        <h3 className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          {column.name}
        </h3>
        <span
          className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ color: 'var(--color-ink-faint)', background: 'var(--color-paper)' }}
        >
          {cards.length}
        </span>
        <button
          type="button"
          onClick={() => onRenameColumn(column)}
          aria-label={t('common.edit')}
          className="rounded p-1 hover:opacity-70"
          style={{ color: 'var(--color-ink-light)' }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteColumn(column)}
          aria-label={t('common.delete')}
          className="rounded p-1 hover:opacity-70"
          style={{ color: 'var(--color-danger, #dc2626)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-24">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              subplot={card.subplotId ? subplotById.get(card.subplotId) ?? null : null}
              onEdit={onEditCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-ink-faint)' }}>
            {t('structureApp.emptyColumn')}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddCard(column.id)}
        className="flex items-center gap-1.5 mx-2 mb-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--color-ink-light)' }}
      >
        <Plus className="w-4 h-4" />
        {t('structureApp.addCard')}
      </button>
    </div>
  )
}
