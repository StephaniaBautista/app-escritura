import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ChevronUp, ListTree } from 'lucide-react'
import { EventIcon } from '@/components/timeline/EventIcon'

const MIN_YEAR = -100
const MAX_YEAR = -64
const TICKS = [-100, -90, -80, -70]
const ERA = { start: -100, end: -72 }

interface DemoEvent {
  id: string
  year: number
  titleKey: string
  descKey: string
  icon: string
  color: string
}

const DEMO_EVENTS: DemoEvent[] = [
  { id: 'e1', year: -99, titleKey: 'timeline.morningEvent', descKey: 'timeline.event1Desc', icon: 'check', color: 'var(--color-accent-teal)' },
  { id: 'e2', year: -90, titleKey: 'timeline.noonEvent', descKey: 'timeline.event2Desc', icon: 'pin', color: 'var(--color-accent)' },
  { id: 'e3', year: -84, titleKey: 'timeline.afternoonEvent', descKey: 'timeline.event3Desc', icon: 'sparkles', color: 'var(--color-accent-violet)' },
  { id: 'e4', year: -75, titleKey: 'timeline.nightEvent', descKey: 'timeline.event4Desc', icon: 'flag', color: 'var(--color-accent-teal)' },
]

function leftPct(year: number): number {
  return ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100
}

export function LandingTimelinePreview() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIndex = DEMO_EVENTS.findIndex((e) => e.id === selectedId)
  const selected = selectedIndex >= 0 ? DEMO_EVENTS[selectedIndex] : null
  const yearUnit = t('timeline.unitYears')
  const eraName = t('timeline.eraName')

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl" style={{ color: 'var(--color-ink)' }}>
          <ListTree className="h-5 w-5" style={{ color: 'var(--color-accent-teal)' }} />
          {t('timeline.bandsTitle')}
        </h3>
      </div>

      <div className="relative h-7 select-none border-b" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
        {TICKS.map((year) => (
          <span
            key={year}
            className="absolute bottom-0 top-0 flex items-center pl-1 text-[13px] font-semibold whitespace-nowrap"
            style={{ left: `${leftPct(year)}%`, color: 'var(--color-ink)' }}
          >
            {year} {yearUnit}
          </span>
        ))}
      </div>

      <div className="relative select-none pb-3">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {TICKS.map((year) => (
            <span key={year} className="absolute bottom-0 top-0 border-l" style={{ left: `${leftPct(year)}%`, borderColor: 'var(--color-ink-faint)', opacity: 0.4 }} />
          ))}
        </div>

        <div className="relative h-7">
          <div
            className="absolute top-0 flex h-full items-center shadow-sm"
            style={{
              left: `${leftPct(ERA.start)}%`,
              width: `${leftPct(ERA.end) - leftPct(ERA.start)}%`,
              minWidth: 90,
              background: 'var(--color-accent-teal)',
              color: 'var(--color-paper)',
              opacity: 0.92,
            }}
          >
            <span className="min-w-0 flex-1 truncate px-2.5 text-[15px] font-bold">{eraName}</span>
          </div>
        </div>

        <div className="relative">
          <span
            className="relative z-[1] mt-2 inline-flex items-center gap-1.5 rounded-r-md py-1 pl-2 pr-3 text-[15px] font-bold shadow-sm"
            style={{ background: 'var(--color-ink-faint)', color: 'var(--color-paper)' }}
          >
            <ChevronUp className="h-4 w-4" />
            {t('timeline.laneOther')}
          </span>
          <div className="relative h-[88px]">
            {DEMO_EVENTS.map((event, i) => {
              const isSelected = selectedId === event.id
              return (
                <div key={event.id} className="absolute" style={{ left: `${leftPct(event.year)}%`, top: 6 + (i % 2) * 36 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                    aria-pressed={isSelected}
                    className="flex max-w-[46vw] items-center gap-1.5 rounded-md py-1 pr-2 sm:max-w-[220px]"
                  >
                    <EventIcon
                      icon={event.icon}
                      className="h-[18px] w-[18px] shrink-0"
                      style={{ color: event.color, fill: event.icon === 'check' ? 'transparent' : event.color, fillOpacity: 0.25 }}
                      aria-hidden
                    />
                    <span
                      className={`truncate text-[15px] font-bold ${isSelected ? 'underline decoration-2 underline-offset-4' : ''}`}
                      style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-ink)' }}
                    >
                      {t(event.titleKey)}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selected && (
        <div className="relative flex items-center justify-center border-t px-10 pb-4 pt-6" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={() => setSelectedId(DEMO_EVENTS[Math.max(0, selectedIndex - 1)].id)}
            disabled={selectedIndex <= 0}
            aria-label={t('timeline.prev')}
            className="absolute left-2 top-1/2 flex h-11 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl shadow disabled:opacity-40"
            style={{ background: 'var(--color-ink-light)', color: 'var(--color-paper)' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(DEMO_EVENTS[Math.min(DEMO_EVENTS.length - 1, selectedIndex + 1)].id)}
            disabled={selectedIndex >= DEMO_EVENTS.length - 1}
            aria-label={t('timeline.next')}
            className="absolute right-2 top-1/2 flex h-11 w-8 -translate-y-1/2 items-center justify-center rounded-l-xl shadow disabled:opacity-40"
            style={{ background: 'var(--color-ink-light)', color: 'var(--color-paper)' }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="w-full max-w-[480px] rounded-2xl border p-4 shadow-lg" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-ink-light)' }}>
            <h4 className="text-lg font-bold underline decoration-2 underline-offset-4" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>
              {t(selected.titleKey)}
            </h4>
            <p className="mt-2 text-[15px]" style={{ color: 'var(--color-ink)' }}>
              {selected.year} {yearUnit}
            </p>
            <p className="text-[15px]" style={{ color: 'var(--color-ink)' }}>
              {eraName} {selected.year - ERA.start + 1} {yearUnit}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              {t(selected.descKey)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
