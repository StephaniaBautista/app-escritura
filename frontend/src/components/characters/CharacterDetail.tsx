import { useTranslation } from 'react-i18next'
import { X, Pencil, GitFork, History } from 'lucide-react'
import type { Character } from '@/types/character'
import { FamilyTree } from './FamilyTree'

const ATTRIBUTE_KEYS = [
  'motivations', 'weaknesses', 'internalConflict', 'personality', 'virtues',
  'flaws', 'jobStudies', 'clothing', 'skills', 'health', 'hobbies', 'extraData',
] as const

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

  const demographics: { label: string; value: string | null }[] = [
    { label: t('characterApp.fieldAge'), value: character.age },
    { label: t('characterApp.fieldGender'), value: character.gender },
    { label: t('characterApp.heightLabel'), value: character.heightCm ? `${character.heightCm} cm` : null },
    { label: t('characterApp.fieldOrientation'), value: character.orientation },
    { label: t('characterApp.fieldMaritalStatus'), value: character.maritalStatus },
    { label: t('characterApp.speciesLabel'), value: character.species },
    { label: t('characterApp.fieldBirthPlace'), value: character.birthPlace },
    { label: t('characterApp.fieldBirthDate'), value: character.birthDate },
  ]

  const visibleAttributes = ATTRIBUTE_KEYS.filter((k) => character.attributes?.[k])

  const source = characters.find((c) => c.id === character.evolvesFromId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            {character.imageUrl && (
              <img src={character.imageUrl} alt="" className="w-8 h-8 object-cover rounded-full" />
            )}
            {character.name}
            {character.isOC && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'var(--color-accent-teal-light)', color: 'var(--color-accent-teal)' }}>
                OC
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onEvolve} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}>
              <GitFork className="w-3.5 h-3.5" />
              {t('characterApp.evolve')}
            </button>
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80"
              style={{ background: 'var(--color-accent)' }}>
              <Pencil className="w-3.5 h-3.5" />
              {t('characterApp.edit')}
            </button>
            <button onClick={onClose} aria-label={t('characterApp.cancel')} className="hover:opacity-70">
              <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {character.description && (
            <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{character.description}</p>
          )}

          {character.nicknames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {character.nicknames.map((n) => (
                <span key={n} className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}>
                  {n}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {demographics.filter((d) => d.value).map((d) => (
              <div key={d.label} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--color-paper-lines)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-ink-faint)' }}>
                  {d.label}
                </p>
                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--color-ink)' }}>{d.value}</p>
              </div>
            ))}
          </div>

          {character.role && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--color-accent-teal-light)', color: 'var(--color-accent-teal)' }}>
                {character.role}
              </span>
              {character.roleSpec && (
                <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{character.roleSpec}</span>
              )}
            </div>
          )}

          {source && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: 'var(--color-accent-violet)' }}>
                <History className="w-3.5 h-3.5" />
                {t('characterApp.evolvedFrom')} {source.name}
              </p>
              {character.evolutionReason && (
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{character.evolutionReason}</p>
              )}
            </div>
          )}

          {(character.evolutions?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-faint)' }}>
                {t('characterApp.evolutions')}
              </h3>
              <div className="space-y-1.5">
                {character.evolutions?.map((ev) => (
                  <button key={ev.id} onClick={() => onSelect(ev.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}>
                    <History className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
                    <span className="text-sm font-medium">{ev.name}</span>
                    {ev.evolutionReason && (
                      <span className="text-xs truncate ml-auto" style={{ color: 'var(--color-ink-faint)' }}>
                        {ev.evolutionReason}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.familyTree')}
            </h3>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <FamilyTree character={character} characters={characters} onSelect={onSelect} />
            </div>
          </div>

          {visibleAttributes.length > 0 && (
            <div className="space-y-3">
              {visibleAttributes.map((key) => (
                <div key={key}>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                    {t(`characterApp.attr_${key}`)}
                  </h4>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>
                    {character.attributes?.[key]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
