import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Hourglass, Clock3, X, Loader2 } from 'lucide-react'
import type { TimelineEraInput } from '@/types/timeline'
import { useToastStore } from '@/stores/toast-store'

const PALETTE = ['#ab152b', '#2d6b6b', '#6b2d6b', '#b45309', '#2d5f8a', '#4d7c0f']

const PRECISIONS = [
  { value: 'year', unitKey: 'unitYears' },
  { value: 'month', unitKey: 'unitMonths' },
  { value: 'week', unitKey: 'unitWeeks' },
  { value: 'day', unitKey: 'unitDays' },
  { value: 'hour', unitKey: 'unitHours' },
  { value: 'minute', unitKey: 'unitMinutes' },
] as const

interface EraDialogProps {
  isOpen: boolean
  onSubmit: (data: TimelineEraInput) => void
  onCancel: () => void
}

export function EraDialog({ isOpen, onSubmit, onCancel }: EraDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [precision, setPrecision] = useState<string>('year')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rollover, setRollover] = useState('newYear')
  const nameRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setColor(PALETTE[0])
      setPrecision('year')
      setFrom('')
      setTo('')
      setRollover('newYear')
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const unitKey = PRECISIONS.find((p) => p.value === precision)?.unitKey ?? 'unitYears'
  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('timelineApp.eraNameRequired'))
      return
    }
    setIsSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        color,
        precision,
        startDate: from.trim() ? `${from.trim()} ${t(`timelineApp.${unitKey}`)}` : null,
        endDate: to.trim() ? `${to.trim()} ${t(`timelineApp.${unitKey}`)}` : null,
        rollover,
      })
      setName('')
      setColor(PALETTE[0])
      setPrecision('year')
      setFrom('')
      setTo('')
      setRollover('newYear')
      onCancel()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative notebook-paper w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}>
          <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Hourglass className="w-5 h-5" style={{ color: 'var(--color-accent-teal)' }} />
            {t('timelineApp.agregarEpoca')}
          </h2>
          <button type="button" onClick={onCancel} aria-label={t('timelineApp.cancel')} className="hover:opacity-70">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldColor')}</span>
            <div className="flex items-center gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`${t('timelineApp.fieldColor')} ${c}`}
                  aria-pressed={color === c}
                  className="w-6 h-6 rounded-full border-2 transition-transform"
                  style={{
                    background: c,
                    borderColor: color === c ? 'var(--color-ink)' : 'transparent',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder={t('timelineApp.eraNamePlaceholder')}
            className="w-full bg-transparent border-0 border-b text-sm py-2 focus:outline-none focus:border-[var(--color-accent)]"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />

          <div className="space-y-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
              <Clock3 className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
              {t('timelineApp.setDateTitle')}
            </h3>

            <div className="flex items-center gap-3">
              <label htmlFor="era-precision" className="text-sm shrink-0" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.precisionLabel')}</label>
              <select
                id="era-precision"
                value={precision}
                onChange={(e) => setPrecision(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
              >
                {PRECISIONS.map((p) => (
                  <option key={p.value} value={p.value}>{t(`timelineApp.${p.unitKey}`)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="era-from" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.rangeFrom')}</label>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
                  <input
                    id="era-from"
                    type="number"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="-90"
                    className="w-full bg-transparent border-0 focus:outline-none text-sm"
                    style={{ color: 'var(--color-ink)' }}
                  />
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-ink-faint)' }}>{t(`timelineApp.${unitKey}`)}</span>
                </div>
              </div>
              <div>
                <label htmlFor="era-to" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.rangeTo')}</label>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
                  <input
                    id="era-to"
                    type="number"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="-84"
                    className="w-full bg-transparent border-0 focus:outline-none text-sm"
                    style={{ color: 'var(--color-ink)' }}
                  />
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-ink-faint)' }}>{t(`timelineApp.${unitKey}`)}</span>
                </div>
              </div>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="font-display text-base font-bold flex items-center gap-2 mb-1" style={{ color: 'var(--color-ink)' }}>
              <Hourglass className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
              {t('timelineApp.rolloverTitle')}
            </legend>
            {([
              { value: 'newYear', titleKey: 'rolloverNewYear', descKey: 'rolloverNewYearDesc' },
              { value: 'afterYear', titleKey: 'rolloverAfterYear', descKey: 'rolloverAfterYearDesc' },
            ]).map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="era-rollover"
                  value={opt.value}
                  checked={rollover === opt.value}
                  onChange={() => setRollover(opt.value)}
                  className="mt-1 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{t(`timelineApp.${opt.titleKey}`)}</span>
                  <span className="block text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-ink-faint)' }}>{t(`timelineApp.${opt.descKey}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4 sticky bottom-0" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}>
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
            {t('timelineApp.cancel')}
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--color-accent)' }}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('timelineApp.agregarEpoca')}
          </button>
        </div>
      </div>
    </div>
  )
}
