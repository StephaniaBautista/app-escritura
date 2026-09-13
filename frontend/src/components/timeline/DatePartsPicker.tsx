import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TimelineConfig, TimelinePrecision } from '@/types/timeline'
import { DEFAULT_TIMELINE_CONFIG } from '@/types/timeline'
import type { DateParts } from '@/lib/timeline-date'
import { buildYearOptions, formatYearLabel } from '@/lib/timeline-date'
import { PillSelect } from '@/components/ui/SheetFields'
import { MONTH_KEYS } from './timeline-constants'

interface DatePartsPickerProps {
  idPrefix: string
  value: DateParts
  precision: TimelinePrecision
  onChange: (parts: DateParts) => void
  disabled?: boolean
  contextYears?: readonly number[]
  timelineConfig?: TimelineConfig
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function DatePartsPicker({
  idPrefix,
  value,
  precision,
  onChange,
  disabled = false,
  contextYears = [],
  timelineConfig,
}: DatePartsPickerProps) {
  const { t } = useTranslation()
  const yearFallbacks = {
    before: t('timelineApp.eraBefore'),
    after: t('timelineApp.eraAfter'),
    yearUnit: t('timelineApp.unitYears'),
  }
  const config = timelineConfig ?? DEFAULT_TIMELINE_CONFIG
  const showMonth = precision !== 'year'
  const showDay = precision === 'day' || precision === 'minute'
  const showTime = precision === 'minute'
  const years = useMemo(() => buildYearOptions(value.year, contextYears), [value.year, contextYears])
  const selectedYear = Number.isFinite(value.year) ? value.year : years.includes(0) ? 0 : years[0]

  const patch = (partial: Partial<DateParts>) => onChange({ ...value, ...partial })

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {showDay && (
        <PillSelect
          id={`${idPrefix}-day`}
          aria-label={t('timelineApp.partDay')}
          value={value.day ?? 1}
          onChange={(e) => patch({ day: Number(e.target.value) })}
          disabled={disabled}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </PillSelect>
      )}
      {showMonth && (
        <PillSelect
          id={`${idPrefix}-month`}
          aria-label={t('timelineApp.partMonth')}
          value={value.month ?? 1}
          onChange={(e) => patch({ month: Number(e.target.value) })}
          disabled={disabled}
        >
          {MONTH_KEYS.map((key, i) => (
            <option key={key} value={i + 1}>{t(`timelineApp.month.${key}`)}</option>
          ))}
        </PillSelect>
      )}
      <PillSelect
        id={`${idPrefix}-year`}
        aria-label={t('timelineApp.partYear')}
        value={selectedYear}
        onChange={(e) => patch({ year: Number(e.target.value) })}
        disabled={disabled}
      >
        {years.map((y) => (
          <option key={y} value={y}>{formatYearLabel(y, config, yearFallbacks)}</option>
        ))}
      </PillSelect>
      {showTime && (
        <span className="inline-flex items-center rounded-full border px-4 py-2" style={{ borderColor: 'var(--color-ink)' }}>
          <input
            id={`${idPrefix}-time`}
            type="time"
            aria-label={t('timelineApp.partTime')}
            value={`${String(value.hour ?? 0).padStart(2, '0')}:${String(value.minute ?? 0).padStart(2, '0')}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number)
              if (Number.isFinite(h) && Number.isFinite(m)) patch({ hour: h, minute: m })
            }}
            disabled={disabled}
            className="bg-transparent text-[15px] font-medium focus:outline-none"
            style={{ color: 'var(--color-ink)' }}
          />
        </span>
      )}
    </div>
  )
}
