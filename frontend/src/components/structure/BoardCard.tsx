import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { StructureCard } from '@/types/structure'

interface BoardCardProps {
  card: StructureCard
  onEdit: (card: StructureCard) => void
}

export function BoardCard({ card, onEdit }: BoardCardProps) {
  const { t } = useTranslation()
  const wasDragging = useRef(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: 'var(--color-paper)',
        borderColor: 'var(--color-paper-lines)',
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (wasDragging.current) {
          wasDragging.current = false
          return
        }
        onEdit(card)
      }}
      className="rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow touch-none"
    >
      {card.color && (
        <div className="h-1 w-8 rounded-full mb-2" style={{ background: card.color }} />
      )}
      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>
        {card.title}
      </p>
      {card.description && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-ink-faint)' }}>
          {card.description}
        </p>
      )}
      <span
        className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
        style={{ color: 'var(--color-accent-violet)', background: 'var(--color-accent-light)' }}
      >
        {t(`structureApp.cardType.${card.cardType}`)}
      </span>
    </div>
  )
}
