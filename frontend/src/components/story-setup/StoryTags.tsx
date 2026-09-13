import { useTranslation } from 'react-i18next'
import { Autocomplete } from './Autocomplete'
import { SingleSelect } from './SingleSelect'
import { SuggestTagsButton } from './SuggestTagsButton'
import type { StoryMeta } from '@/types/story'

interface StoryTagsProps {
  projectId: string
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryTags({ projectId, meta, update }: StoryTagsProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="story-tags" className="block text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
            {t('storySetup.tags')}
          </label>
          <SuggestTagsButton projectId={projectId} meta={meta} update={update} />
        </div>
        <Autocomplete
          id="story-tags"
          optionType="tag"
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
