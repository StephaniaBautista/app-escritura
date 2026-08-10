import { useTranslation } from 'react-i18next'
import { X, Pencil, GitFork, History } from 'lucide-react'
import type { Character } from '@/types/character'
import { FamilyTree } from './FamilyTree'
import { CharacterSheet } from './CharacterSheet'

interface CharacterDetailProps {
  character: Character
  characters: Character[]
  onClose: () => void
  onEdit: () => void
  onEvolve: () => void
  onSelect: (id: string) => void
}

export function CharacterDetail({ character, characters, onClose, onEdit, onEvolve, onSelect }: CharacterDetailProps) {
  const { t } = useTranslation()
  const source = characters.find((c) => c.id === character.evolvesFromId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default bg-black/50" onClick={onClose} aria-label={t('characterApp.closeDetail')} />
      <div
        className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[var(--radius)] shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display flex min-w-0 items-center gap-2 truncate text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('characterApp.sheetLabel')}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onEvolve}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 sm:px-3"
              style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('characterApp.evolve')}</span>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:px-3"
              style={{ background: 'var(--color-accent)' }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('characterApp.edit')}</span>
            </button>
            <button type="button" onClick={onClose} aria-label={t('characterApp.cancel')} className="p-1 hover:opacity-70">
              <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-3 sm:p-5">
          <CharacterSheet character={character} />

          {source && (
            <section className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-accent-violet)' }}>
                <History className="h-3.5 w-3.5" />
                {t('characterApp.evolvedFrom')} {source.name}
              </p>
              {character.evolutionReason && (
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{character.evolutionReason}</p>
              )}
            </section>
          )}

          {(character.evolutions?.length ?? 0) > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
                {t('characterApp.evolutions')}
              </h3>
              <div className="space-y-1.5">
                {character.evolutions?.map((evolution) => (
                  <button
                    key={evolution.id}
                    type="button"
                    onClick={() => onSelect(evolution.id)}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-opacity hover:opacity-80"
                    style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                  >
                    <History className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
                    <span className="text-sm font-medium">{evolution.name}</span>
                    {evolution.evolutionReason && (
                      <span className="ml-auto truncate text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {evolution.evolutionReason}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.familyTree')}
            </h3>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <FamilyTree character={character} characters={characters} onSelect={onSelect} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
