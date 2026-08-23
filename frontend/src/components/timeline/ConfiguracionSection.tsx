import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const QUESTION_KEYS = ['configQWhen', 'configQPlaces'] as const

export function ConfiguracionSection() {
  const { t } = useTranslation()
  const [answers, setAnswers] = useState<Record<string, string>>({})

  return (
    <div className="notebook-paper overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}>
        <h3 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
          <span className="inline-flex w-5 h-5 items-center justify-center" style={{ color: 'var(--color-ink)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          </span>
          {t('timelineApp.configuracion')}
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {QUESTION_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
              {t(`timelineApp.${key}`)}
            </p>
            <input
              value={answers[key] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={t('timelineApp.answerPlaceholder')}
              className="w-full bg-transparent border-0 border-b text-sm py-1.5 focus:outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
