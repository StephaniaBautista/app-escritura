import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TimelineEvent } from '@/types/timeline'
import { labelWidthPercent, stackRows } from '@/lib/timeline-layout'
import { EventIcon } from './EventIcon'

export interface PositionedEvent {
  event: TimelineEvent
  x: number
  xEnd: number | null
}

interface EventGroupLaneProps {
  name: string
  items: PositionedEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const ROW_HEIGHT = 34

export function EventGroupLane({ name, items, selectedId, onSelect }: EventGroupLaneProps) {
  const [open, setOpen] = useState(true)

  const rows = useMemo(
    () => stackRows(items.map((it) => ({ x: it.x, w: Math.max(labelWidthPercent(it.event.title), (it.xEnd ?? it.x) - it.x + 2) }))),
    [items],
  )
  const rowCount = rows.length > 0 ? Math.max(...rows) + 1 : 0

  return (
    <div className="relative">
      <button
        type="button"
        data-no-pan
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative z-[1] mt-2 inline-flex items-center gap-1.5 rounded-r-md py-1 pl-2 pr-3 text-[15px] font-bold shadow-sm"
        style={{ background: 'var(--color-ink-faint)', color: 'var(--color-paper)' }}
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
                style={{ left: `${it.x}%`, width: `${it.xEnd - it.x}%`, top: 6 + rows[i] * ROW_HEIGHT + 24, background: it.event.color ?? 'var(--color-accent-teal)', opacity: 0.6 }}
                aria-hidden
              />
            ) : null,
          )}
          {items.map((it, i) => {
            const isSelected = selectedId === it.event.id
            const color = it.event.color ?? 'var(--color-accent-teal)'
            const top = 6 + rows[i] * ROW_HEIGHT
            return (
              <div key={it.event.id} data-testid={`timeline-event-${it.event.id}`} className="absolute" style={{ left: `${it.x}%`, top }}>
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
