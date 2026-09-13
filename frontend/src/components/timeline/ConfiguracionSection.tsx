import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Loader2, MessageSquareText } from 'lucide-react'
import type { TimelineConfig, TimelineTimeSystem } from '@/types/timeline'
import { useTimelineStore } from '@/stores/timeline-store'
import { SectionTitle, UnderlineInput } from '@/components/ui/SheetFields'

const QUESTION_KEYS = ['configQWhen', 'configQWorldview', 'configQPlaces'] as const
const LABEL_SAVE_MS = 400

const TIME_SYSTEM_OPTIONS: { value: TimelineTimeSystem; titleKey: string; descKey: string }[] = [
  { value: 'relative', titleKey: 'timeSystemRelative', descKey: 'timeSystemRelativeDesc' },
  { value: 'era', titleKey: 'timeSystemEra', descKey: 'timeSystemEraDesc' },
]

interface ConfiguracionSectionProps {
  projectId: string
}

function buildConfig(timeSystem: TimelineTimeSystem, before: string, after: string): TimelineConfig {
  return {
    timeSystem,
    ...(before.trim() ? { beforeLabel: before.trim().slice(0, 10) } : {}),
    ...(after.trim() ? { afterLabel: after.trim().slice(0, 10) } : {}),
  }
}

export function ConfiguracionSection({ projectId }: ConfiguracionSectionProps) {
  const { t } = useTranslation()
  const { timelineConfig, isSavingTimelineConfig, updateTimelineConfig } = useTimelineStore()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [beforeLabel, setBeforeLabel] = useState(timelineConfig.beforeLabel ?? '')
  const [afterLabel, setAfterLabel] = useState(timelineConfig.afterLabel ?? '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setBeforeLabel(timelineConfig.beforeLabel ?? '')
    setAfterLabel(timelineConfig.afterLabel ?? '')
  }, [timelineConfig.beforeLabel, timelineConfig.afterLabel, timelineConfig.timeSystem])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const applyOptimistic = (next: TimelineConfig) => {
    useTimelineStore.setState({ timelineConfig: next })
  }

  const persist = (next: TimelineConfig) => {
    void updateTimelineConfig(projectId, next)
  }

  const scheduleLabelSave = (b: string, a: string) => {
    const next = buildConfig('era', b, a)
    applyOptimistic(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(next), LABEL_SAVE_MS)
  }

  const setTimeSystem = (timeSystem: TimelineTimeSystem) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const next = buildConfig(timeSystem, beforeLabel, afterLabel)
    applyOptimistic(next)
    persist(next)
  }

  return (
    <div className="notebook-paper overflow-hidden">
      <div className="flex items-center border-b px-4 py-3" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
          <MessageSquareText className="h-5 w-5" />
          {t('timelineApp.configuracion')}
        </h3>
      </div>

      <div className="space-y-8 p-4">
        <fieldset className="space-y-4">
          <legend className="mb-1">
            <SectionTitle icon={Clock}>
              <span className="inline-flex items-center gap-2">
                {t('timelineApp.timeSystemTitle')}
                {isSavingTimelineConfig && (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-accent)' }} aria-label={t('timelineApp.configSaving')} />
                )}
              </span>
            </SectionTitle>
          </legend>
          {TIME_SYSTEM_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-start gap-4 pl-1">
              <input
                type="radio"
                name="timeline-time-system"
                value={opt.value}
                checked={timelineConfig.timeSystem === opt.value}
                onChange={() => setTimeSystem(opt.value)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-[15px] font-bold" style={{ color: 'var(--color-ink)' }}>{t(`timelineApp.${opt.titleKey}`)}</span>
                <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: 'var(--color-ink-light)' }}>{t(`timelineApp.${opt.descKey}`)}</span>
              </span>
            </label>
          ))}
          {timelineConfig.timeSystem === 'era' && (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <UnderlineInput
                type="text"
                value={beforeLabel}
                onChange={(e) => {
                  const value = e.target.value
                  setBeforeLabel(value)
                  scheduleLabelSave(value, afterLabel)
                }}
                placeholder={t('timelineApp.eraBeforePlaceholder')}
                aria-label={t('timelineApp.eraBeforeLabel')}
                maxLength={10}
              />
              <UnderlineInput
                type="text"
                value={afterLabel}
                onChange={(e) => {
                  const value = e.target.value
                  setAfterLabel(value)
                  scheduleLabelSave(beforeLabel, value)
                }}
                placeholder={t('timelineApp.eraAfterPlaceholder')}
                aria-label={t('timelineApp.eraAfterLabel')}
                maxLength={10}
              />
            </div>
          )}
        </fieldset>

        {QUESTION_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
              {t(`timelineApp.${key}`)}
            </p>
            <input
              value={answers[key] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={t('timelineApp.answerPlaceholder')}
              aria-label={t(`timelineApp.${key}`)}
              className="w-full border-0 border-b bg-transparent py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
