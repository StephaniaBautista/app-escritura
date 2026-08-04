import { useTranslation } from 'react-i18next'
import { ChipInput } from './ChipInput'
import { MultiSelect } from './MultiSelect'
import type { StoryMeta } from '@/types/story'

interface StoryPeopleProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryPeople({ meta, update }: StoryPeopleProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="story-categories" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.categories')}
        </label>
        <MultiSelect
          id="story-categories"
          optionType="category"
          value={meta.categories ?? []}
          onChange={(categories) => update({ categories })}
          placeholder={t('storySetup.categoriesPlaceholder')}
        />
      </div>

      <div>
        <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.ships')}
        </p>
        <ChipInput
          value={meta.ships ?? []}
          onChange={(ships) => update({ ships })}
          placeholder={t('storySetup.shipsPlaceholder')}
        />
      </div>
    </div>
  )
}
