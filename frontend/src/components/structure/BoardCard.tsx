import { useEffect, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { StructureCard, Subplot } from '@/types/structure'
import { subplotLayerColor } from '@/lib/subplot-visibility'
import './subplot-layer.css'

interface BoardCardProps {
  card: StructureCard
  subplot?: Subplot | null
  onEdit: (card: StructureCard) => void
}

export function BoardCard({ card, subplot = null, onEdit }: BoardCardProps) {
  const { t } = useTranslation()
  const wasDragging = useRef(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })
  const isLayer = Boolean(card.subplotId)
  const color = subplotLayerColor(subplot)

  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  const surface: CSSProperties = isLayer
    ? { '--subplot-color': color } as CSSProperties
    : { background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...surface,
        ...(isDragging ? { opacity: 0.5 } : {}),
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
      data-testid={`board-card-${card.id}`}
      data-subplot-layer={isLayer ? 'true' : undefined}
      className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow touch-none ${isLayer ? 'subplot-layer-card' : ''}`}
    >
      {isLayer && (
        <span className="subplot-layer-card__pill mb-2" title={subplot?.title ?? t('structureApp.subplotField')}>
          {subplot?.title ?? t('structureApp.subplotField')}
        </span>
      )}
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
