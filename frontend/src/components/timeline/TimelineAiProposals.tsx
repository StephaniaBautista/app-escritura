import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import type { AiTimelineEraFill, AiTimelineEventFill } from '@/types/ai'

interface TimelineAiProposalsProps {
  eras: AiTimelineEraFill[]
  events: AiTimelineEventFill[]
  addingAll?: boolean
  onClose: () => void
  onPickEra: (fill: AiTimelineEraFill) => void
  onPickEvent: (fill: AiTimelineEventFill) => void
  onAddAll: () => Promise<void> | void
}

export function TimelineAiProposals({
  eras, events, addingAll = false, onClose, onPickEra, onPickEvent, onAddAll,
}: TimelineAiProposalsProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const busy = addingAll || pending

  const handleAddAll = async () => {
    if (busy || (eras.length === 0 && events.length === 0)) return
    setPending(true)
    try {
      await onAddAll()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="timeline-ai-proposals-title">
      <button type="button" className="absolute inset-0 cursor-default bg-black/50" onClick={busy ? undefined : onClose} aria-label={t('timelineApp.cancel')} />
      <div
        className="relative flex w-full max-w-lg max-h-[88vh] flex-col overflow-hidden rounded-[var(--radius)] border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <div>
            <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-ink-faint)' }}>
              {t('timelineApp.title')}
            </p>
            <h2 id="timeline-ai-proposals-title" className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {t('timelineApp.aiProposalsTitle')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('timelineApp.aiProposalsHint')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t('timelineApp.cancel')} className="p-1 hover:opacity-70 disabled:opacity-40">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {eras.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.aiErasHeading')}</h3>
              <ul className="space-y-3">
                {eras.map((era, index) => (
                  <li key={`${era.name}:${index}`} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{era.name}</p>
                        {era.startDate || era.endDate ? (
                          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{[era.startDate, era.endDate].filter(Boolean).join(' – ')}</p>
                        ) : null}
                      </div>
                      <button type="button" className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40" style={{ background: 'var(--color-accent)' }} disabled={busy} onClick={() => onPickEra(era)}>
                        {t('timelineApp.aiUseEra')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {events.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.aiEventsHeading')}</h3>
              <ul className="space-y-3">
                {events.map((event, index) => (
                  <li key={`${event.title}:${index}`} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{event.title}</p>
                        {event.eraName ? <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{event.eraName}</p> : null}
                        {event.description ? <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>{event.description}</p> : null}
                      </div>
                      <button type="button" className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40" style={{ background: 'var(--color-accent)' }} disabled={busy} onClick={() => onPickEvent(event)}>
                        {t('timelineApp.aiUseEvent')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <footer className="border-t px-4 py-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
            disabled={busy || (eras.length === 0 && events.length === 0)}
            aria-busy={busy}
            onClick={() => { void handleAddAll() }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? t('timelineApp.aiAddingAll') : t('timelineApp.aiAddAll')}
          </button>
        </footer>
      </div>
    </div>
  )
}
