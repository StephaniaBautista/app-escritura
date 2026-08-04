import { useTranslation } from 'react-i18next'
import { SingleSelect } from './SingleSelect'
import { ChipInput } from './ChipInput'
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
  const { t } = useTranslation()

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

      <Field label={t('storySetup.guidedMentalState')} id="guided-mental">
        <TextArea
          id="guided-mental"
          value={meta.initialState ?? ''}
          onChange={(v) => update({ initialState: v })}
          placeholder={t('storySetup.guidedMentalStatePlaceholder')}
          rows={2}
        />
      </Field>

      <Field label={t('storySetup.guidedPhysicalState')} id="guided-physical">
        <TextArea
          id="guided-physical"
          value={meta.initialPhysicalState ?? ''}
          onChange={(v) => update({ initialPhysicalState: v })}
          placeholder={t('storySetup.guidedPhysicalStatePlaceholder')}
          rows={2}
        />
      </Field>

      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.guidedProblems')}
        </p>
        <ChipInput
          value={meta.problems ?? []}
          onChange={(problems) => update({ problems })}
          placeholder={t('storySetup.problemsPlaceholder')}
        />
      </div>
    </div>
  )
}
