import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { SingleSelect } from './SingleSelect'
import { storyBankApi, type StoryQuestion } from '@/services/story-bank'
import type { StoryMeta } from '@/types/story'

interface StoryGuidedQuestionsProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none"
      style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
    />
  )
}

export function StoryGuidedQuestions({ meta, update }: StoryGuidedQuestionsProps) {
  const { t, i18n } = useTranslation()
  const [bank, setBank] = useState<StoryQuestion[] | null>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    let alive = true
    storyBankApi
      .listQuestions()
      .then((questions) => {
        if (alive) setBank(questions)
      })
      .catch(() => {
        if (alive) setBank([])
      })
    return () => {
      alive = false
    }
  }, [])

  const lang = i18n.language
  const qText = (q: StoryQuestion): string => (lang === 'en' && q.textEn ? q.textEn : q.text)

  const bankAnswers = meta.bankAnswers ?? {}
  const answeredIds = new Set(Object.keys(bankAnswers))

  const addQuestion = (id: string) => {
    update({ bankAnswers: { ...bankAnswers, [id]: '' } })
    setPicking(false)
  }

  const removeQuestion = (id: string) => {
    const next = { ...bankAnswers }
    delete next[id]
    update({ bankAnswers: next })
  }

  const available = (bank ?? []).filter((q) => !answeredIds.has(q.id))

  return (
    <div className="space-y-5">
      <Field label={t('storySetup.guidedEnding')} id="guided-ending">
        <SingleSelect
          id="guided-ending"
          optionType="ending"
          value={meta.ending}
          onChange={(ending) => update({ ending })}
          placeholder={t('storySetup.endingPlaceholder')}
        />
      </Field>

      <Field label={t('storySetup.guidedProtagonistLife')} id="guided-life">
        <TextArea
          id="guided-life"
          value={meta.protagonistLife ?? ''}
          onChange={(v) => update({ protagonistLife: v })}
          placeholder={t('storySetup.guidedProtagonistLifePlaceholder')}
        />
      </Field>

      <Field label={t('storySetup.guidedEvolution')} id="guided-evolution">
        <TextArea
          id="guided-evolution"
          value={meta.protagonistEvolution ?? ''}
          onChange={(v) => update({ protagonistEvolution: v })}
          placeholder={t('storySetup.guidedEvolutionPlaceholder')}
        />
      </Field>

      <Field label={t('storySetup.guidedWorldContext')} id="guided-world">
        <TextArea
          id="guided-world"
          value={meta.worldContext ?? ''}
          onChange={(v) => update({ worldContext: v })}
          placeholder={t('storySetup.guidedWorldContextPlaceholder')}
          rows={2}
        />
      </Field>

      <Field label={t('storySetup.guidedInitialSituation')} id="guided-situation">
        <TextArea
          id="guided-situation"
          value={meta.initialSituation ?? ''}
          onChange={(v) => update({ initialSituation: v })}
          placeholder={t('storySetup.guidedInitialSituationPlaceholder')}
          rows={2}
        />
      </Field>

      <Field label={t('storySetup.guidedCentralTheme')} id="guided-theme">
        <TextArea
          id="guided-theme"
          value={meta.centralTheme ?? ''}
          onChange={(v) => update({ centralTheme: v })}
          placeholder={t('storySetup.guidedCentralThemePlaceholder')}
          rows={2}
        />
      </Field>

      <Field label={t('storySetup.guidedProblems')} id="guided-problems">
        <TextArea
          id="guided-problems"
          value={meta.problems ?? ''}
          onChange={(v) => update({ problems: v })}
          placeholder={t('storySetup.problemsPlaceholder')}
          rows={3}
        />
      </Field>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
            {t('storySetup.bankTitle')}
          </p>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            disabled={bank === null || available.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {bank === null ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {t('storySetup.bankAdd')}
          </button>
        </div>

        {picking && bank !== null && (
          <div className="space-y-1.5 mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
            {available.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                {t('storySetup.bankEmpty')}
              </p>
            ) : (
              available.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => addQuestion(q.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm border hover:opacity-90 transition-all"
                  style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                >
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                  {qText(q)}
                </button>
              ))
            )}
          </div>
        )}

        {answeredIds.size === 0 && !picking && (
          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {t('storySetup.bankHint')}
          </p>
        )}

        <div className="space-y-3">
          {Object.entries(bankAnswers).map(([questionId, answer]) => {
            const question = (bank ?? []).find((q) => q.id === questionId)
            return (
              <div key={questionId}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label htmlFor={`bank-${questionId}`} className="text-xs font-medium" style={{ color: 'var(--color-ink-light)' }}>
                    {question ? qText(question) : questionId}
                  </label>
                  <button type="button" onClick={() => removeQuestion(questionId)} aria-label={t('common.remove')} className="hover:opacity-70">
                    <X className="w-4 h-4" style={{ color: 'var(--color-ink-light)' }} />
                  </button>
                </div>
                <TextArea
                  id={`bank-${questionId}`}
                  value={answer}
                  onChange={(v) => update({ bankAnswers: { ...bankAnswers, [questionId]: v } })}
                  rows={2}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
