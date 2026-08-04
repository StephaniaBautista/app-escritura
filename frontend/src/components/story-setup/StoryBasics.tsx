import { useTranslation } from 'react-i18next'
import { SingleSelect } from './SingleSelect'
import { MultiSelect } from './MultiSelect'
import type { StoryMeta } from '@/types/story'

interface StoryBasicsProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

const FANFIC_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Sí' },
]

export function StoryBasics({ meta, update }: StoryBasicsProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="story-rating" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.rating')}
        </label>
        <SingleSelect
          id="story-rating"
          optionType="rating"
          value={meta.rating}
          onChange={(rating) => update({ rating: rating as StoryMeta['rating'] })}
          placeholder={t('storySetup.ratingPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="story-type" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.type')}
        </label>
        <MultiSelect
          id="story-type"
          optionType="storyType"
          value={meta.type ?? []}
          onChange={(type) => update({ type })}
          placeholder={t('storySetup.typePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="story-fanfic" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
          {t('storySetup.isFanfic')}
        </label>
        <SingleSelect
          id="story-fanfic"
          options={FANFIC_OPTIONS}
          value={meta.isFanfic === true ? 'yes' : meta.isFanfic === false ? 'no' : undefined}
          onChange={(v) => {
            const isFanfic = v === 'yes'
            update({
              isFanfic,
              fandoms: isFanfic ? meta.fandoms : undefined,
              categories: isFanfic ? meta.categories : undefined,
              ships: isFanfic ? meta.ships : undefined,
            })
          }}
          placeholder={t('storySetup.fanficPlaceholder')}
        />
        {meta.isFanfic && (
          <div className="mt-3">
            <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
              {t('storySetup.fandoms')}
            </p>
            <MultiSelect
              optionType="fandom"
              value={meta.fandoms ?? []}
              onChange={(fandoms) => update({ fandoms })}
              placeholder={t('storySetup.fandomsPlaceholder')}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              {t('storySetup.fandomsHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
