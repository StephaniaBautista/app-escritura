import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, ZoomIn, ZoomOut, ListTree, ArrowLeft, ArrowRight, MapPin } from 'lucide-react'
import type { TimelineEra, TimelineEvent } from '@/types/timeline'
import {
  buildTicks,
  DAY,
  HOUR,
  initialWindow,
  MINUTE,
  MONTH,
  pannedWindow,
  parseDateValue,
  posPercent,
  type TimeWindow,
  type UnitKey,
  WEEK,
  YEAR,
  zoomedWindow,
} from '@/lib/timeline-scale'

interface FranjasTimelineProps {
  events: TimelineEvent[]
  eras: TimelineEra[]
  characters: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (event: TimelineEvent) => void
  onDelete: (event: TimelineEvent) => void
  onDeleteEra: (era: TimelineEra) => void
}

const DURATION_TABLE: { base: number; unitKey: UnitKey }[] = [
  { base: YEAR, unitKey: 'unitYears' },
  { base: MONTH, unitKey: 'unitMonths' },
  { base: WEEK, unitKey: 'unitWeeks' },
  { base: DAY, unitKey: 'unitDays' },
  { base: HOUR, unitKey: 'unitHours' },
  { base: MINUTE, unitKey: 'unitMinutes' },
]

function formatDuration(minutes: number): { amount: number; unitKey: UnitKey } {
  const abs = Math.abs(minutes)
  for (const { base, unitKey } of DURATION_TABLE) {
    if (abs >= base) return { amount: Number((abs / base).toFixed(2)), unitKey }
  }
  return { amount: abs, unitKey: 'unitMinutes' }
}

export function FranjasTimeline({ events, eras, characters, selectedId, onSelect, onEdit, onDelete, onDeleteEra }: FranjasTimelineProps) {
  const { t } = useTranslation()
  const [win, setWin] = useState<TimeWindow>(() => initialWindow([]))
  const [isPanning, setIsPanning] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const didInitRef = useRef(false)
  const panRef = useRef<{ startX: number; startWin: TimeWindow } | null>(null)

  const characterName = useMemo(() => {
    const map = new Map(characters.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? t('timelineApp.laneGeneral')
  }, [characters, t])

  const values = useMemo(() => {
    const parsed = events.map((e) => parseDateValue(e.date))
    const known = parsed.filter((v): v is number => v !== null)
    const maxKnown = known.length > 0 ? Math.max(...known) : 0
    let k = 0
    return parsed.map((v) => (v !== null ? v : maxKnown + ++k * DAY))
  }, [events])

  useEffect(() => {
    if (!didInitRef.current && values.length > 0) {
      setWin(initialWindow(values))
      didInitRef.current = true
    }
  }, [values])

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
  }, [])

  const ticks = useMemo(() => buildTicks(win), [win])
  const pos = (value: number) => (win ? posPercent(win, value) : 0)

  const onPanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!win || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { startX: e.clientX, startWin: win }
    setIsPanning(true)
  }
  const onPanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan) return
    const rect = e.currentTarget.getBoundingClientRect()
    const deltaFrac = rect.width > 0 ? (e.clientX - pan.startX) / rect.width : 0
    setWin(pannedWindow(pan.startWin, deltaFrac))
  }
  const onPanEnd = () => {
    panRef.current = null
    setIsPanning(false)
  }

  const eraBands = useMemo(
    () =>
      eras.map((era) => {
        const s = parseDateValue(era.startDate)
        const e = parseDateValue(era.endDate)
        const lo = s !== null && e !== null ? Math.min(s, e) : null
        const hi = s !== null && e !== null ? Math.max(s, e) : null
        return { era, lo, hi }
      }),
    [eras],
  )

  const eraRows = useMemo(() => {
    const sorted = [...eraBands].sort((a, b) => {
      if (a.lo === null && b.lo === null) return 0
      if (a.lo === null) return 1
      if (b.lo === null) return -1
      return a.lo - b.lo
    })
    const rowEnds: number[] = []
    const grouped: (typeof eraBands)[] = []

    for (const band of sorted) {
      const row = band.lo !== null && band.hi !== null
        ? rowEnds.findIndex((end) => end <= band.lo!)
        : -1

      if (row === -1) {
        grouped.push([band])
        rowEnds.push(band.hi ?? Number.POSITIVE_INFINITY)
      } else {
        grouped[row].push(band)
        rowEnds[row] = band.hi ?? Number.POSITIVE_INFINITY
      }
    }

    return grouped
  }, [eraBands])

  const orderedByValue = useMemo(
    () => [...events].sort((a, b) => values[events.indexOf(a)] - values[events.indexOf(b)]),
    [events, values],
  )
  const selectedIndex = orderedByValue.findIndex((e) => e.id === selectedId)
  const selectedEvent = selectedIndex >= 0 ? orderedByValue[selectedIndex] : null

  const selectedInfo = useMemo(() => {
    if (!selectedEvent) return null
    const value = values[events.findIndex((e) => e.id === selectedEvent.id)]
    const era = eras.find((er) => er.id === selectedEvent.eraId) ?? null
    let duration: string | null = null
    if (era) {
      const s = parseDateValue(era.startDate)
      const e = parseDateValue(era.endDate)
      if (s !== null && e !== null) {
        const d = formatDuration(e - s)
        duration = `${d.amount} ${t(`timelineApp.${d.unitKey}`)}`
      }
    }
    return { x: pos(value), era, duration }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, values, events, eras, t, win])

  return (
    <div className="space-y-4">
      <div className="notebook-paper overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
          <h3 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <ListTree className="w-5 h-5" style={{ color: 'var(--color-accent-teal)' }} />
            {t('timelineApp.franjasTemporales')}
          </h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWin((w) => zoomedWindow(w, 0.6))} aria-label={t('timelineApp.zoomIn')} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
              <ZoomIn className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setWin((w) => zoomedWindow(w, 1 / 0.6))} aria-label={t('timelineApp.zoomOut')} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={boardRef} title={t('timelineApp.zoomHint')}>
          <div className="relative h-7 border-b select-none" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
            {ticks.map((tk) => (
              <span key={tk.at} className="absolute top-0 bottom-0 flex items-center pl-1 text-[11px] font-semibold whitespace-nowrap" style={{ left: `${pos(tk.at)}%`, color: 'var(--color-ink)' }}>
                {tk.amount} {t(`timelineApp.${tk.unitKey}`)}
              </span>
            ))}
          </div>

          <div
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            onPointerCancel={onPanEnd}
            className={`relative select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${eras.length === 0 && events.length === 0 ? 'min-h-[160px]' : ''}`}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {ticks.map((tk) => (
                <span key={tk.at} className="absolute top-0 bottom-0 border-l" style={{ left: `${pos(tk.at)}%`, borderColor: 'var(--color-ink-faint)', opacity: 0.4 }} />
              ))}
            </div>

            {eras.length === 0 && events.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                {t('timelineApp.empty')}
              </p>
            )}

            {eraRows.map((row, rowIndex) => (
              <div key={`era-row-${rowIndex}`} className="relative h-7" style={{ marginTop: rowIndex === 0 ? 0 : 10 }}>
                {row.map(({ era, lo, hi }) => {
                  const color = era.color ?? 'var(--color-accent-teal)'
                  const left = lo !== null ? pos(lo) : 0
                  const rawWidth = hi !== null ? pos(hi) - left : 100 - left
                  const width = Math.max(Math.min(rawWidth, 100 - left), 6)
                  return (
                    <div
                      key={era.id}
                      className="absolute top-0 flex items-center rounded-md shadow-sm cursor-default"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 90,
                        background: color,
                        backgroundImage: `linear-gradient(180deg, ${color} 0%, color-mix(in srgb, ${color} 88%, white) 100%)`,
                        color: 'var(--color-paper)',
                        opacity: 0.88,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <span className="flex-1 min-w-0 px-2.5 py-1 text-xs font-bold truncate">{era.name}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteEra(era)}
                        aria-label={t('common.delete')}
                        className="shrink-0 mr-1 p-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.2)' }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}

            {events.length > 0 && (
              <div className="relative h-20 mt-1">
                {events.map((event) => {
                  const value = values[events.findIndex((e) => e.id === event.id)]
                  const isSelected = selectedId === event.id
                  return (
                    <div key={event.id} data-testid={`timeline-event-${event.id}`} className="absolute top-2.5 flex items-center gap-1 max-w-[75%]" style={{ left: `${pos(value)}%` }}>
                      <MapPin
                        className="w-4 h-4 shrink-0"
                        style={{
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-accent-teal)',
                          fill: isSelected ? 'var(--color-accent)' : 'var(--color-accent-teal)',
                          opacity: 0.85,
                        }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => onSelect(event.id)}
                        className={`truncate text-sm font-semibold ${isSelected ? 'underline decoration-2 underline-offset-4' : ''}`}
                        style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-ink)' }}
                      >
                        {event.title}
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(event) }} aria-label={t('timelineApp.edit')} className="shrink-0 p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3" style={{ color: 'var(--color-ink-light)' }} />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(event) }} aria-label={t('common.delete')} className="shrink-0 p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3" style={{ color: 'var(--color-danger, #dc2626)' }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEvent && selectedInfo && (
        <div className="relative flex items-center justify-center px-12 pt-7 pb-2">
          <svg className="absolute top-0 left-0 pointer-events-none" width="100%" height="26" aria-hidden>
            <line x1={`${selectedInfo.x}%`} y1="0" x2="50%" y2="24" stroke="var(--color-ink-light)" strokeWidth="1.25" />
          </svg>
          <button
            type="button"
            onClick={() => selectedIndex > 0 && onSelect(orderedByValue[selectedIndex - 1].id)}
            disabled={selectedIndex === 0}
            aria-label={t('timelineApp.prev')}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow disabled:opacity-40 hover:opacity-90"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => selectedIndex < orderedByValue.length - 1 && onSelect(orderedByValue[selectedIndex + 1].id)}
            disabled={selectedIndex === orderedByValue.length - 1}
            aria-label={t('timelineApp.next')}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow disabled:opacity-40 hover:opacity-90"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative w-full max-w-[560px] notebook-paper border rounded-lg shadow-lg p-4 pr-10" style={{ borderColor: 'var(--color-ink-light)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-base sm:text-lg font-bold underline decoration-2 underline-offset-4 break-words" style={{ color: 'var(--color-ink)' }}>
                  {selectedEvent.title}
                </h4>
                {selectedEvent.date && (
                  <p className="text-sm mt-1.5" style={{ color: 'var(--color-ink)' }}>
                    {selectedEvent.date}
                  </p>
                )}
                {selectedInfo.era && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink)' }}>
                    {selectedInfo.era.name}
                    {selectedInfo.duration ? ` ${selectedInfo.duration}` : ''}
                  </p>
                )}
                {selectedEvent.description && (
                  <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                    {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.characterIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedEvent.characterIds.map((id) => (
                      <span key={id} className="rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink-light)' }}>
                        {characterName(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => onEdit(selectedEvent)} aria-label={t('timelineApp.edit')} className="shrink-0 p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-ink)' }}>
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}