import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Autocomplete } from './Autocomplete'
import type { StoryMeta } from '@/types/story'

interface StoryCharactersProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryCharacters({ meta, update }: StoryCharactersProps) {
  const { t } = useTranslation()
  const characters = meta.characters ?? []

  const toggleOC = (index: number) =>
    update({ characters: characters.map((c, i) => (i === index ? { ...c, isOC: !c.isOC } : c)) })

  const remove = (index: number) =>
    update({ characters: characters.filter((_, i) => i !== index) })

  const handleChange = (names: string[]) => {
    const next = names.map((name) => {
      const existing = characters.find((c) => c.name === name)
      return existing ? { ...existing } : { name, isOC: false }
    })
    update({ characters: next })
  }

  return (
    <div>
      <label htmlFor="story-characters" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
        {t('storySetup.characters')}
      </label>
      <Autocomplete
        id="story-characters"
        optionType="character"
        value={characters.map((c) => c.name)}
        onChange={handleChange}
        placeholder={t('storySetup.charactersPlaceholder')}
        hideChips
      />
      {characters.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {characters.map((character, index) => (
            <div
              key={`${character.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
            >
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-ink)' }}>
                {character.name}
              </span>
              <button
                type="button"
                onClick={() => toggleOC(index)}
                className="px-2 py-1 rounded-full text-[11px] font-medium border transition-all"
                style={{
                  borderColor: character.isOC ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
                  background: character.isOC ? 'var(--color-accent-violet-light)' : 'transparent',
                  color: character.isOC ? 'var(--color-accent-violet)' : 'var(--color-ink-light)',
                }}
                aria-pressed={character.isOC}
              >
                {character.isOC ? t('storySetup.oc') : t('storySetup.canon')}
              </button>
              <button type="button" onClick={() => remove(index)} aria-label={t('common.remove')} className="hover:opacity-70">
                <X className="w-4 h-4" style={{ color: 'var(--color-ink-light)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
