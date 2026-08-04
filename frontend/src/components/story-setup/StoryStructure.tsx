import { useTranslation } from 'react-i18next'
import { ChipInput } from './ChipInput'
import { SingleSelect } from './SingleSelect'
import type { StoryMeta } from '@/types/story'

interface StoryStructureProps {
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

export function StoryStructure({ meta, update }: StoryStructureProps) {
  const { t } = useTranslation()
  const structure = meta.structure ?? {}
  const duration = meta.duration ?? {}

  const setStructure = (patch: Partial<StoryMeta['structure']>) =>
    update({ structure: { ...structure, ...patch } })

  return (
    <div className="space-y-5">
      <Field label={t('storySetup.duration')} id="story-duration">
        <div className="grid grid-cols-2 gap-2">
          <input
            id="story-duration"
            type="number"
            min={0}
            value={duration.chapters ?? ''}
            onChange={(e) => update({ duration: { ...duration, chapters: e.target.value ? Number(e.target.value) : undefined } })}
            placeholder={t('storySetup.chapters')}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
          <input
            type="number"
            min={0}
            value={duration.words ?? ''}
            onChange={(e) => update({ duration: { ...duration, words: e.target.value ? Number(e.target.value) : undefined } })}
            placeholder={t('storySetup.words')}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
        </div>
      </Field>

      <Field label={t('storySetup.ending')} id="story-ending">
        <SingleSelect
          id="story-ending"
          optionType="ending"
          value={meta.ending}
          onChange={(ending) => update({ ending })}
          placeholder={t('storySetup.endingPlaceholder')}
        />
      </Field>

      <Field label={t('storySetup.structureInicio')} id="story-inicio">
        <TextArea id="story-inicio" value={structure.inicio ?? ''} onChange={(v) => setStructure({ inicio: v })} placeholder={t('storySetup.structureInicioHint')} />
      </Field>
      <Field label={t('storySetup.structureDesarrollo')} id="story-desarrollo">
        <TextArea id="story-desarrollo" value={structure.desarrollo ?? ''} onChange={(v) => setStructure({ desarrollo: v })} placeholder={t('storySetup.structureDesarrolloHint')} />
      </Field>
      <Field label={t('storySetup.structureClimax')} id="story-climax">
        <TextArea id="story-climax" value={structure.climax ?? ''} onChange={(v) => setStructure({ climax: v })} placeholder={t('storySetup.structureClimaxHint')} />
      </Field>
      <Field label={t('storySetup.structureFinal')} id="story-final">
        <TextArea id="story-final" value={structure.final ?? ''} onChange={(v) => setStructure({ final: v })} placeholder={t('storySetup.structureFinalHint')} />
      </Field>

      <Field label={t('storySetup.protagonistEvolution')} id="story-evolution">
        <TextArea id="story-evolution" value={meta.protagonistEvolution ?? ''} onChange={(v) => update({ protagonistEvolution: v })} />
      </Field>
      <Field label={t('storySetup.initialState')} id="story-state">
        <TextArea id="story-state" value={meta.initialState ?? ''} onChange={(v) => update({ initialState: v })} />
      </Field>

      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.problems')}
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
