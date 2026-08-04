import { useTranslation } from 'react-i18next'
import { ChipInput } from './ChipInput'
import { SingleSelect } from './SingleSelect'
import type { StoryMeta } from '@/types/story'

interface StoryTagsProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryTags({ meta, update }: StoryTagsProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.tags')}
        </p>
        <ChipInput
          value={meta.tags ?? []}
          onChange={(tags) => update({ tags })}
          placeholder={t('storySetup.tagsPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="story-narrator" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.narrator')}
        </label>
        <SingleSelect
          id="story-narrator"
          optionType="narrator"
          value={meta.narrator}
          onChange={(narrator) => update({ narrator })}
          placeholder={t('storySetup.narratorPlaceholder')}
        />
      </div>
    </div>
  )
}
