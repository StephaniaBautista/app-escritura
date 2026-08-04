import { useTranslation } from 'react-i18next'
import type { StoryMeta } from '@/types/story'

interface StoryDurationProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryDuration({ meta, update }: StoryDurationProps) {
  const { t } = useTranslation()
  const duration = meta.duration ?? {}

  return (
    <div className="space-y-5">
      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.durationQuestion')}
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-ink-faint)' }}>
          {t('storySetup.durationHint')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="story-chapters" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
              {t('storySetup.chapters')}
            </label>
            <input
              id="story-chapters"
              type="number"
              min={0}
              value={duration.chapters ?? ''}
              onChange={(e) => update({ duration: { ...duration, chapters: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="ej: 20"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            />
          </div>
          <div>
            <label htmlFor="story-words" className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
              {t('storySetup.words')}
            </label>
            <input
              id="story-words"
              type="number"
              min={0}
              value={duration.words ?? ''}
              onChange={(e) => update({ duration: { ...duration, words: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="ej: 50000"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.guidedModeQuestion')}
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-ink-faint)' }}>
          {t('storySetup.guidedModeHint')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: t('storySetup.guidedModeYes'), desc: t('storySetup.guidedModeYesDesc') },
            { value: false, label: t('storySetup.guidedModeNo'), desc: t('storySetup.guidedModeNoDesc') },
          ].map((opt) => {
            const selected = meta.guidedMode === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => update({ guidedMode: opt.value })}
                className="px-3 py-3 rounded-lg text-sm border text-left transition-all hover:opacity-90"
                style={{
                  borderColor: selected ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                  background: selected ? 'var(--color-accent-light)' : 'var(--color-background)',
                  color: 'var(--color-ink)',
                }}
              >
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>{opt.desc}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
