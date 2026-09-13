import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, ZoomIn, ZoomOut, ListTree } from 'lucide-react'
import type { TimelineConfig, TimelineEra, TimelineEvent } from '@/types/timeline'
import { buildTicks, DAY, initialWindow, pannedWindow, parseDateValue, posPercent, type TimeWindow, zoomedWindow } from '@/lib/timeline-scale'
import { eraContaining, eraRange, formatYearLabel } from '@/lib/timeline-date'
import { EventGroupLane, type PositionedEvent } from './EventGroupLane'
import { EventDetailCard } from './EventDetailCard'

interface FranjasTimelineProps {
  events: TimelineEvent[]
  eras: TimelineEra[]
  timelineConfig: TimelineConfig
  characters: { id: string; name: string }[]
  documents: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onEdit: (event: TimelineEvent) => void
  onDelete: (event: TimelineEvent) => void
  onEditEra: (era: TimelineEra) => void
  onDeleteEra: (era: TimelineEra) => void
}

interface EraBand {
  era: TimelineEra
  lo: number | null
  hi: number | null
}

function groupEraRows(bands: EraBand[]): EraBand[][] {
  const sorted = [...bands].sort((a, b) => {
    if (a.lo === null && b.lo === null) return 0
    if (a.lo === null) return 1
    if (b.lo === null) return -1
    return a.lo - b.lo
  })
  const rowEnds: number[] = []
  const rows: EraBand[][] = []
  for (const band of sorted) {
    const row = band.lo !== null ? rowEnds.findIndex((end) => end <= band.lo!) : -1
    const end = band.hi ?? Number.POSITIVE_INFINITY
    if (row === -1) {
      rows.push([band])
      rowEnds.push(end)
    } else {
      rows[row].push(band)
      rowEnds[row] = end
    }
  }
  return rows
}

export function FranjasTimeline({ events, eras, timelineConfig, characters, documents, selectedId, onSelect, onEdit, onDelete, onEditEra, onDeleteEra }: FranjasTimelineProps) {
  const { t } = useTranslation()
  const yearFallbacks = {
    before: t('timelineApp.eraBefore'),
    after: t('timelineApp.eraAfter'),
    yearUnit: t('timelineApp.unitYears'),
  }
  const formatTick = (amount: number, unitKey: string) => {
    if (unitKey === 'unitYears') return formatYearLabel(Math.round(amount), timelineConfig, yearFallbacks)
    return `${amount} ${t(`timelineApp.${unitKey}`)}`
  }
  const [userWin, setUserWin] = useState<TimeWindow | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ startX: number; startWin: TimeWindow } | null>(null)
  const didPanRef = useRef(false)

  const characterName = useMemo(() => {
    const map = new Map(characters.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? t('timelineApp.laneGeneral')
  }, [characters, t])
  const documentName = useMemo(() => {
    const map = new Map(documents.map((d) => [d.id, d.name]))
    return (id: string) => map.get(id) ?? t('timelineApp.relatedPoints')
  }, [documents, t])

  const values = useMemo(() => {
    const parsed = events.map((e) => parseDateValue(e.date))
    const known = parsed.filter((v): v is number => v !== null)
    const maxKnown = known.length > 0 ? Math.max(...known) : 0
    let k = 0
    const map = new Map<string, number>()
    events.forEach((e, i) => map.set(e.id, parsed[i] !== null ? parsed[i]! : maxKnown + ++k * DAY))
    return map
  }, [events])

  const autoWin = useMemo(() => {
    const eraEdges = eras.flatMap((era) => {
      const r = eraRange(era)
      if (!r) return []
      return Number.isFinite(r.hi) ? [r.lo, r.hi] : [r.lo]
    })
    return initialWindow([...values.values(), ...eraEdges])
  }, [values, eras])
  const win = userWin ?? autoWin
  const setWin = useCallback((next: TimeWindow | ((w: TimeWindow) => TimeWindow)) => {
    setUserWin((prev) => (typeof next === 'function' ? next(prev ?? autoWin) : next))
  }, [autoWin])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const frac = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5
      setWin((w) => zoomedWindow(w, Math.exp(e.deltaY * 0.002), frac))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setWin])

  const ticks = useMemo(() => buildTicks(win), [win])
  const pos = useCallback((value: number) => posPercent(win, value), [win])

  const onPanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-no-pan]')) return
    didPanRef.current = false
    panRef.current = { startX: e.clientX, startWin: win }
  }
  const onPanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan) return
    const dx = e.clientX - pan.startX
    if (!didPanRef.current) {
      if (Math.abs(dx) < 6) return
      didPanRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsPanning(true)
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setWin(pannedWindow(pan.startWin, rect.width > 0 ? dx / rect.width : 0))
  }
  const onPanEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (didPanRef.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    panRef.current = null
    setIsPanning(false)
  }

  const selectEvent = (id: string) => {
    if (didPanRef.current) return
    onSelect(id === selectedId ? null : id)
  }

  const eraRows = useMemo(
    () => groupEraRows(eras.map((era) => {
      const r = eraRange(era)
      return { era, lo: r?.lo ?? null, hi: r && Number.isFinite(r.hi) ? r.hi : null }
    })),
    [eras],
  )

  const groups = useMemo(() => {
    const map = new Map<string, PositionedEvent[]>()
    for (const event of events) {
      const key = event.groupName ?? ''
      const end = parseDateValue(event.endDate)
      const item: PositionedEvent = { event, x: pos(values.get(event.id)!), xEnd: end !== null ? pos(end) : null }
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
  }, [events, values, pos])

  const ordered = useMemo(() => [...events].sort((a, b) => values.get(a.id)! - values.get(b.id)!), [events, values])
  const selectedIndex = ordered.findIndex((e) => e.id === selectedId)
  const selected = selectedIndex >= 0 ? ordered[selectedIndex] : null
  const selectedValue = selected ? values.get(selected.id)! : 0
  const selectedEra = selected ? eras.find((er) => er.id === selected.eraId) ?? eraContaining(eras, selectedValue) : null
  const isEmpty = eras.length === 0 && events.length === 0

  return (
    <div className="space-y-4">
      <div className="notebook-paper overflow-hidden">
        <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl" style={{ color: 'var(--color-ink)' }}>
            <ListTree className="h-5 w-5" style={{ color: 'var(--color-accent-teal)' }} />
            {t('timelineApp.franjasTemporales')}
          </h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWin((w) => zoomedWindow(w, 0.6))} aria-label={t('timelineApp.zoomIn')} className="rounded p-1.5 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setWin((w) => zoomedWindow(w, 1 / 0.6))} aria-label={t('timelineApp.zoomOut')} className="rounded p-1.5 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={boardRef} title={t('timelineApp.zoomHint')}>
          <div className="relative h-7 select-none border-b" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
            {ticks.map((tk) => (
              <span key={tk.at} className="absolute bottom-0 top-0 flex items-center pl-1 text-[13px] font-semibold whitespace-nowrap" style={{ left: `${pos(tk.at)}%`, color: 'var(--color-ink)' }}>
                {formatTick(tk.amount, tk.unitKey)}
              </span>
            ))}
          </div>

          <div
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            onPointerCancel={onPanEnd}
            onClick={(e) => {
              if (didPanRef.current) return
              if ((e.target as HTMLElement).closest('button, [data-no-pan]')) return
              onSelect(null)
            }}
            className={`relative select-none pb-3 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${isEmpty ? 'min-h-[160px]' : ''}`}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {ticks.map((tk) => (
                <span key={tk.at} className="absolute bottom-0 top-0 border-l" style={{ left: `${pos(tk.at)}%`, borderColor: 'var(--color-ink-faint)', opacity: 0.4 }} />
              ))}
            </div>

            {isEmpty && (
              <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                {t('timelineApp.empty')}
              </p>
            )}

            {eraRows.map((row, rowIndex) => (
              <div key={`era-row-${rowIndex}`} className="relative h-7" style={{ marginTop: rowIndex === 0 ? 0 : 6 }}>
                {row.map(({ era, lo, hi }) => {
                  const color = era.color ?? 'var(--color-accent-teal)'
                  const left = lo !== null ? pos(lo) : 0
                  const rawWidth = hi !== null ? pos(hi) - left : 100 - left
                  const width = Math.max(Math.min(rawWidth, 100 - left), 4)
                  return (
                    <div
                      key={era.id}
                      className="group absolute top-0 flex h-full items-center shadow-sm"
                      style={{ left: `${left}%`, width: `${width}%`, minWidth: 90, background: color, color: 'var(--color-paper)', opacity: 0.92 }}
                    >
                      <span className="min-w-0 flex-1 truncate px-2.5 text-[15px] font-bold">{era.name}</span>
                      <span data-no-pan className="mr-1 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" onClick={() => onEditEra(era)} aria-label={t('timelineApp.editEpoca')} className="rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => onDeleteEra(era)} aria-label={t('common.delete')} className="rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}

            {groups.map(([name, items]) => (
              <EventGroupLane key={name || '__general__'} name={name || t('timelineApp.laneGeneral')} items={items} selectedId={selectedId} onSelect={selectEvent} />
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <EventDetailCard
          event={selected}
          era={selectedEra}
          value={selectedValue}
          anchorX={pos(selectedValue)}
          timelineConfig={timelineConfig}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < ordered.length - 1}
          characterName={characterName}
          documentName={documentName}
          onPrev={() => onSelect(ordered[selectedIndex - 1].id)}
          onNext={() => onSelect(ordered[selectedIndex + 1].id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
