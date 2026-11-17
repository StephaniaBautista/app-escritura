import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TimelineEvent } from '@/types/timeline'
import type { Subplot } from '@/types/structure'
import { labelWidthPercent, stackRows } from '@/lib/timeline-layout'
import { subplotLayerColor } from '@/lib/subplot-visibility'
import { EventIcon } from './EventIcon'
import type { TimelineLaneKind } from '@/lib/timeline-groups'
import '@/components/structure/subplot-layer.css'

export interface PositionedEvent {
  event: TimelineEvent
  x: number
  xEnd: number | null
  subplot?: Subplot | null
}

interface EventGroupLaneProps {
  name: string
  items: PositionedEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  kind?: TimelineLaneKind
  accentColor?: string | null
}

const ROW_HEIGHT = 34

function eventColor(it: PositionedEvent, kind: TimelineLaneKind, accent: string | null): string {
  if (kind === 'subplot') return it.event.color ?? accent ?? subplotLayerColor(it.subplot)
  return it.event.color ?? 'var(--color-accent-teal)'
}

export function EventGroupLane({ name, items, selectedId, onSelect, kind = 'group', accentColor = null }: EventGroupLaneProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const isSubplotLane = kind === 'subplot'
  const accent = accentColor ?? (isSubplotLane ? subplotLayerColor(items[0]?.subplot) : null)

  const rows = useMemo(
    () => stackRows(items.map((it) => ({ x: it.x, w: Math.max(labelWidthPercent(it.event.title), (it.xEnd ?? it.x) - it.x + 2) }))),
    [items],
  )
  const rowCount = rows.length > 0 ? Math.max(...rows) + 1 : 0
  const laneStyle: CSSProperties = isSubplotLane ? { '--subplot-color': accent ?? 'var(--color-accent-violet)' } as CSSProperties : {}

  return (
    <div
      className={`relative ${isSubplotLane ? 'subplot-layer-lane' : ''}`}
      style={laneStyle}
      data-testid={isSubplotLane ? `timeline-subplot-lane-${name}` : `timeline-group-lane-${name}`}
      data-subplot-lane={isSubplotLane ? 'true' : undefined}
    >
      <button
        type="button"
        data-no-pan
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={isSubplotLane ? t('structureApp.subplotLane', { name }) : undefined}
        className={`relative z-[1] mt-2 inline-flex items-center gap-1.5 rounded-r-md py-1 pl-2 pr-3 text-[15px] font-bold shadow-sm ${isSubplotLane ? 'subplot-layer-lane__head' : ''}`}
        style={isSubplotLane ? undefined : { background: 'var(--color-ink-faint)', color: 'var(--color-paper)' }}
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {name}
      </button>

      {open && (
        <div className="relative" style={{ height: rowCount * ROW_HEIGHT + 12 }}>
          {items.map((it, i) =>
            it.xEnd !== null && it.xEnd > it.x ? (
              <span
                key={`bar-${it.event.id}`}
                className="absolute h-1.5 rounded-full"
                style={{
                  left: `${it.x}%`,
                  width: `${it.xEnd - it.x}%`,
                  top: 6 + rows[i] * ROW_HEIGHT + 24,
                  background: eventColor(it, kind, accent),
                  opacity: 0.7,
                }}
                aria-hidden
              />
            ) : null,
          )}
          {items.map((it, i) => {
            const isSelected = selectedId === it.event.id
            const color = eventColor(it, kind, accent)
            const top = 6 + rows[i] * ROW_HEIGHT
            return (
              <div
                key={it.event.id}
                data-testid={`timeline-event-${it.event.id}`}
                data-subplot-layer={isSubplotLane ? 'true' : undefined}
                data-selected={isSelected ? 'true' : undefined}
                className={`absolute ${isSubplotLane ? 'subplot-layer-event' : ''}`}
                style={{ left: `${it.x}%`, top }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(it.event.id)
                  }}
                  aria-pressed={isSelected}
                  className="flex max-w-[60vw] items-center gap-1.5 rounded-md py-1 pr-2 sm:max-w-xs"
                >
                  <EventIcon icon={it.event.icon} className="h-[18px] w-[18px] shrink-0" style={{ color, fill: it.event.icon === 'check' ? 'transparent' : color, fillOpacity: 0.25 }} aria-hidden />
                  <span
                    className={`truncate text-[15px] font-bold ${isSelected ? 'underline decoration-2 underline-offset-4' : ''}`}
                    style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-ink)' }}
                  >
                    {it.event.title}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
