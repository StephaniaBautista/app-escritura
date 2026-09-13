import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { TimelineConfig, TimelineEra, TimelineEvent } from '@/types/timeline'
import { eraRelativeYear, formatDateText } from '@/lib/timeline-date'
import { MONTH_KEYS } from './timeline-constants'

interface EventDetailCardProps {
  event: TimelineEvent
  era: TimelineEra | null
  value: number
  anchorX: number
  timelineConfig: TimelineConfig
  hasPrev: boolean
  hasNext: boolean
  characterName: (id: string) => string
  documentName: (id: string) => string
  onPrev: () => void
  onNext: () => void
  onEdit: (event: TimelineEvent) => void
  onDelete: (event: TimelineEvent) => void
}

export function EventDetailCard({ event, era, value, anchorX, timelineConfig, hasPrev, hasNext, characterName, documentName, onPrev, onNext, onEdit, onDelete }: EventDetailCardProps) {
  const { t } = useTranslation()
  const fmt = {
    monthNames: MONTH_KEYS.map((k) => t(`timelineApp.month.${k}`)),
    yearUnit: t('timelineApp.unitYears'),
    eraBefore: t('timelineApp.eraBefore'),
    eraAfter: t('timelineApp.eraAfter'),
    timelineConfig,
  }
  const dateText = formatDateText(event.date, fmt)
  const endText = formatDateText(event.endDate, fmt)
  const relative = era ? eraRelativeYear(era, value) : null

  return (
    <div className="pointer-events-none relative flex items-center justify-center px-12 pb-2 pt-7">
      <svg className="pointer-events-none absolute left-0 top-0" width="100%" height="26" aria-hidden>
        <line x1={`${anchorX}%`} y1="0" x2="50%" y2="24" stroke="var(--color-ink-light)" strokeWidth="1.25" />
      </svg>
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label={t('timelineApp.prev')}
        className="pointer-events-auto absolute left-0 top-1/2 flex h-12 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl shadow hover:opacity-90 disabled:opacity-40"
        style={{ background: 'var(--color-ink-light)', color: 'var(--color-paper)' }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        aria-label={t('timelineApp.next')}
        className="pointer-events-auto absolute right-0 top-1/2 flex h-12 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl shadow hover:opacity-90 disabled:opacity-40"
        style={{ background: 'var(--color-ink-light)', color: 'var(--color-paper)' }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="pointer-events-auto relative w-full max-w-[560px] rounded-2xl border p-4 shadow-lg" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-ink-light)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-lg font-bold underline decoration-2 underline-offset-4 sm:text-xl" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>
              {event.title}
            </h4>
            {dateText && (
              <p className="mt-2 text-[15px]" style={{ color: 'var(--color-ink)' }}>
                {dateText}
                {endText ? ` → ${endText}` : ''}
              </p>
            )}
            {era && (
              <p className="text-[15px]" style={{ color: 'var(--color-ink)' }}>
                {era.name}
                {relative !== null ? ` ${relative} ${fmt.yearUnit}` : ''}
              </p>
            )}
            {event.description && (
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                {event.description}
              </p>
            )}
            {event.imageUrl && (
              <img src={event.imageUrl} alt="" className="mt-3 max-h-48 rounded-xl border object-cover" style={{ borderColor: 'var(--color-paper-lines)' }} />
            )}
            {event.characterIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {event.characterIds.map((id) => (
                  <span key={id} className="rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink-light)' }}>
                    {characterName(id)}
                  </span>
                ))}
              </div>
            )}
            {(event.relatedDocumentIds ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(event.relatedDocumentIds ?? []).map((id) => (
                  <Link
                    key={id}
                    to={`/app/editor/${event.projectId}/${id}`}
                    className="rounded-full border px-2 py-0.5 text-[11px] font-medium hover:opacity-80"
                    style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink-light)' }}
                  >
                    {documentName(id)}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={() => onEdit(event)} aria-label={t('timelineApp.edit')} className="rounded p-1.5 hover:opacity-70" style={{ color: 'var(--color-ink)' }}>
              <Pencil className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => onDelete(event)} aria-label={t('common.delete')} className="rounded p-1.5 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
