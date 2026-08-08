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
  const guided = meta.guidedMode === true
  const characters = meta.characters ?? []

  const toggleOC = (index: number) =>
    update({ characters: characters.map((c, i) => (i === index ? { ...c, isOC: !c.isOC } : c)) })

  const remove = (index: number) =>
    update({ characters: characters.filter((_, i) => i !== index) })

  const setField = (index: number, field: 'initialState' | 'initialPhysicalState', value: string) =>
    update({ characters: characters.map((c, i) => (i === index ? { ...c, [field]: value } : c)) })

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
        fandoms={meta.fandoms ?? []}
      />
      {characters.length > 0 && (
        <div className="space-y-2 mt-2">
          {characters.map((character, index) => (
            <div
              key={`${character.name}-${index}`}
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
            >
              <div className="flex items-center gap-2">
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

              {guided && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
                  <div>
                    <label htmlFor={`char-mental-${index}`} className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {t('storySetup.guidedMentalState')}
                    </label>
                    <textarea
                      id={`char-mental-${index}`}
                      value={character.initialState ?? ''}
                      onChange={(e) => setField(index, 'initialState', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border px-2.5 py-2 text-xs resize-none"
                      style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`char-physical-${index}`} className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {t('storySetup.guidedPhysicalState')}
                    </label>
                    <textarea
                      id={`char-physical-${index}`}
                      value={character.initialPhysicalState ?? ''}
                      onChange={(e) => setField(index, 'initialPhysicalState', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border px-2.5 py-2 text-xs resize-none"
                      style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
