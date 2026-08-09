import { useTranslation } from 'react-i18next'
import { Pencil, GitFork, History, Trash2 } from 'lucide-react'
import type { Character } from '@/types/character'
import { KebabMenu } from '@/components/ui/KebabMenu'

interface CharacterCardProps {
  character: Character
  onEdit: () => void
  onEvolve: () => void
  onDelete: () => void
  onOpen: () => void
  evolutionCount: number
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function CharacterCard({ character, onEdit, onEvolve, onDelete, onOpen, evolutionCount }: CharacterCardProps) {
  const { t } = useTranslation()

  const facts: string[] = []
  if (character.role) facts.push(character.role)
  if (character.age) facts.push(character.age)
  if (character.species) facts.push(character.species)
  if (character.heightCm) facts.push(`${character.heightCm} cm`)

  return (
    <div
      className="notebook-paper rounded-xl overflow-hidden relative group cursor-pointer transition-transform hover:-translate-y-0.5"
      onClick={onOpen}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
              style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
            >
              {initials(character.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold truncate" style={{ color: 'var(--color-ink)' }}>{character.name}</h3>
              {character.isOC && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                  style={{ background: 'var(--color-accent-teal-light)', color: 'var(--color-accent-teal)' }}>
                  OC
                </span>
              )}
            </div>
            {character.nicknames.length > 0 && (
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                {character.nicknames.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {facts.map((fact) => (
                <span key={fact} className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: 'var(--color-background)', color: 'var(--color-ink-light)' }}>
                  {fact}
                </span>
              ))}
            </div>
            {character.evolutionReason && (
              <p className="text-[11px] italic mt-2 line-clamp-2" style={{ color: 'var(--color-accent-violet)' }}>
                {t('characterApp.evolvedFrom')}: {character.evolutionReason}
              </p>
            )}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <KebabMenu
              items={[
                { label: t('characterApp.edit'), icon: Pencil, onClick: onEdit },
                { label: t('characterApp.evolve'), icon: GitFork, onClick: onEvolve },
                { label: t('common.delete'), icon: Trash2, onClick: onDelete, danger: true },
              ]}
            />
          </div>
        </div>
        {evolutionCount > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t text-[11px] font-medium"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}>
            <History className="w-3 h-3" />
            {evolutionCount} {t('characterApp.evolutions')}
          </div>
        )}
      </div>
    </div>
  )
}
