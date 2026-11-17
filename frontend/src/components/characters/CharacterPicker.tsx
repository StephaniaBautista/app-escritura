import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { MessageCircle, Users } from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'
import type { Character } from '@/types/character'
import '@/components/ai/character-chat.css'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface CharacterPickerProps {
  projectId: string
  characters: Character[]
  loading: boolean
  onTalk: (characterId: string) => void
}

export function CharacterPicker({ projectId, characters, loading, onTalk }: CharacterPickerProps) {
  const { t } = useTranslation()

  if (loading && characters.length === 0) return <LoadingState label={t('common.loading')} />
  if (characters.length === 0) {
    return (
      <div className="notebook-paper p-8 text-center">
        <Users className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--color-accent-violet)' }} aria-hidden="true" />
        <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{t('characterApp.empty')}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('characterApp.emptyDesc')}</p>
        <Link to={`/app/documents/${projectId}?tab=characters`} className="ai-panel__link mt-4 inline-block text-sm">
          {t('characterApp.aiManageInProject')}
        </Link>
      </div>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="character-picker-heading">
      <div>
        <h2 id="character-picker-heading" className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
          {t('characterApp.pickHeading')}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('aiApp.characterHint')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => {
          const meta = [character.role, character.species].filter(Boolean).join(' · ')
          return (
            <button key={character.id} type="button" className="ai-character-card" onClick={() => onTalk(character.id)}>
              <span className="ai-character-card__top">
                {character.imageUrl ? (
                  <img src={character.imageUrl} alt="" className="ai-character__avatar" />
                ) : (
                  <span className="ai-character__avatar ai-character__avatar--fallback" aria-hidden="true">
                    {initials(character.name)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="ai-character-card__name block">{character.name}</span>
                  {meta && <span className="ai-character-card__meta block">{meta}</span>}
                </span>
              </span>
              {character.description && <span className="ai-character-card__text">{character.description}</span>}
              <span className="ai-character-card__action">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('characterApp.talk')}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
