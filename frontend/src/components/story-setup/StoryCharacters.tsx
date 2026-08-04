import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import type { StoryMeta } from '@/types/story'

interface StoryCharactersProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function StoryCharacters({ meta, update }: StoryCharactersProps) {
  const { t } = useTranslation()
  const characters = meta.characters ?? []
  const [draft, setDraft] = useState('')

  const add = () => {
    const name = draft.trim()
    if (!name) return
    update({ characters: [...characters, { name, isOC: false }] })
    setDraft('')
  }

  const toggleOC = (index: number) =>
    update({ characters: characters.map((c, i) => (i === index ? { ...c, isOC: !c.isOC } : c)) })

  const remove = (index: number) => update({ characters: characters.filter((_, i) => i !== index) })

  return (
    <div>
      <p className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
        {t('storySetup.characters')}
      </p>
      {characters.length > 0 && (
        <div className="space-y-1.5 mb-2">
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
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={t('storySetup.charactersPlaceholder')}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        />
        <button
          type="button"
          onClick={add}
          aria-label={t('common.add')}
          className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
