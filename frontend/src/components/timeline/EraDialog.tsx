import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, CalendarClock, Timer } from 'lucide-react'
import type { TimelineConfig, TimelineEra, TimelineEraInput, TimelinePrecision } from '@/types/timeline'
import { useToastStore } from '@/stores/toast-store'
import { coerceParts, datePartsToMinutes, describeEraPosition, parseDateParts, serializeDateParts, yearsFromRawDates, type DateParts } from '@/lib/timeline-date'
import { parseDateValue, YEAR } from '@/lib/timeline-scale'
import { FormSheet } from '@/components/ui/FormSheet'
import { ColorDot } from '@/components/ui/ColorDot'
import { SectionTitle, UnderlineInput, UnderlineSelect } from '@/components/ui/SheetFields'
import { DatePartsPicker } from './DatePartsPicker'
import { DEFAULT_ERA_COLOR, EVENT_PRECISIONS, isPrecision, PALETTE, ROLLOVER_OPTIONS } from './timeline-constants'

interface EraDialogProps {
  isOpen: boolean
  era: TimelineEra | null
  eras: TimelineEra[]
  timelineConfig: TimelineConfig
  onSubmit: (data: TimelineEraInput) => Promise<unknown>
  onCancel: () => void
}

function partsFrom(raw: string | null, fallbackYear: number): DateParts {
  const parts = parseDateParts(raw)
  if (parts) return parts
  const legacy = parseDateValue(raw)
  return { year: legacy !== null ? Math.round(legacy / YEAR) : fallbackYear }
}

export function EraDialog({ isOpen, era, ...rest }: EraDialogProps) {
  if (!isOpen) return null
  return <EraForm key={era?.id ?? 'new'} era={era} {...rest} />
}

function EraForm({ era, eras, timelineConfig, onSubmit, onCancel }: Omit<EraDialogProps, 'isOpen'>) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [name, setName] = useState(era?.name ?? '')
  const [color, setColor] = useState<string | null>(era?.color ?? DEFAULT_ERA_COLOR)
  const [precision, setPrecision] = useState<TimelinePrecision>(isPrecision(era?.precision) ? era.precision : 'year')
  const [start, setStart] = useState<DateParts>(() => partsFrom(era?.startDate ?? null, 0))
  const [end, setEnd] = useState<DateParts>(() => partsFrom(era?.endDate ?? null, 0))
  const [rollover, setRollover] = useState<string>(era?.rollover ?? 'newYear')
  const [isSaving, setIsSaving] = useState(false)

  const yearUnit = t('timelineApp.unitYears')
  const contextYears = useMemo(() => yearsFromRawDates(eras.flatMap((e) => [e.startDate, e.endDate])), [eras])
  const others = useMemo(() => eras.filter((e) => e.id !== era?.id), [eras, era])
  const startHint = Number.isFinite(start.year) ? describeEraPosition(others, datePartsToMinutes(coerceParts(start, precision)), yearUnit) : null
  const endHint = Number.isFinite(end.year) ? describeEraPosition(others, datePartsToMinutes(coerceParts(end, precision)), yearUnit) : null

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('timelineApp.eraNameRequired'))
      return
    }
    if (!Number.isFinite(start.year) || !Number.isFinite(end.year)) {
      toast.error(t('timelineApp.yearRequired'))
      return
    }
    setIsSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        color,
        precision,
        startDate: serializeDateParts(coerceParts(start, precision), precision),
        endDate: serializeDateParts(coerceParts(end, precision), precision),
        rollover,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormSheet
      isOpen
      title={era ? t('timelineApp.editEpoca') : t('timelineApp.agregarEpoca')}
      closeLabel={t('timelineApp.cancel')}
      confirmLabel={t('timelineApp.save')}
      isSaving={isSaving}
      onClose={onCancel}
      onConfirm={handleSubmit}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-3">
          <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldColor')}</span>
          <ColorDot value={color} palette={PALETTE} label={t('timelineApp.fieldColor')} onChange={setColor} disabled={isSaving} />
        </div>

        <UnderlineInput
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder={t('timelineApp.eraNamePlaceholder')}
          aria-label={t('timelineApp.eraNamePlaceholder')}
          disabled={isSaving}
        />

        <section className="space-y-4">
          <SectionTitle icon={Timer}>{t('timelineApp.setDateTitle')}</SectionTitle>

          <div className="pl-7">
            <UnderlineSelect
              id="era-precision"
              label={t('timelineApp.precisionLabel')}
              value={precision}
              onChange={(e) => { if (isPrecision(e.target.value)) setPrecision(e.target.value) }}
              disabled={isSaving}
              className="min-w-[240px]"
            >
              {EVENT_PRECISIONS.map((p) => (
                <option key={p.value} value={p.value}>{t(`timelineApp.${p.labelKey}`)}</option>
              ))}
            </UnderlineSelect>
          </div>

          <div className="flex flex-col items-center gap-1.5 pt-1">
            <DatePartsPicker idPrefix="era-start" value={start} precision={precision} onChange={setStart} disabled={isSaving} contextYears={contextYears} timelineConfig={timelineConfig} />
            <p className="min-h-5 text-[15px]" style={{ color: 'var(--color-ink)' }}>{startHint ?? ''}</p>
            <ArrowDown className="h-4 w-4" style={{ color: 'var(--color-ink-faint)' }} aria-hidden />
            <DatePartsPicker idPrefix="era-end" value={end} precision={precision} onChange={setEnd} disabled={isSaving} contextYears={contextYears} timelineConfig={timelineConfig} />
            <p className="min-h-5 text-[15px]" style={{ color: 'var(--color-ink)' }}>{endHint ?? ''}</p>
          </div>
        </section>

        <fieldset className="space-y-4">
          <legend className="mb-3">
            <SectionTitle icon={CalendarClock}>{t('timelineApp.rolloverTitle')}</SectionTitle>
          </legend>
          {ROLLOVER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-start gap-4 pl-1">
              <input
                type="radio"
                name="era-rollover"
                value={opt.value}
                checked={rollover === opt.value}
                onChange={() => setRollover(opt.value)}
                disabled={isSaving}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-[15px] font-bold" style={{ color: 'var(--color-ink)' }}>{t(`timelineApp.${opt.titleKey}`)}</span>
                <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: 'var(--color-ink-light)' }}>{t(`timelineApp.${opt.descKey}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </FormSheet>
  )
}
