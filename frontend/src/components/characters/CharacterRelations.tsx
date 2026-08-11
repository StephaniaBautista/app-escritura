import { useTranslation } from 'react-i18next'
import { Heart, Users, Swords, Handshake, Plus, X, GitBranch, Sparkles } from 'lucide-react'
import type { Character } from '@/types/character'
import {
  isSelfRelation, otherParty, relationshipLabel,
  RELATIONSHIP_TYPES,
  type CharacterRelationship, type RelationshipType,
} from '@/types/relationship'

interface CharacterRelationsProps {
  character: Character
  characters: Character[]
  relations: CharacterRelationship[]
  onSelectCharacter?: (id: string) => void
  onAddRelation?: () => void
  onRemoveRelation?: (relation: CharacterRelationship) => void
}

const TYPE_ICONS: Record<RelationshipType, typeof Heart> = {
  romance: Heart,
  friendship: Handshake,
  enemity: Swords,
  family: Users,
  custom: Sparkles,
}

function chipsFor(relations: CharacterRelationship[], characterId: string): CharacterRelationship[] {
  return relations.filter((rel) => isSelfRelation(rel, characterId))
}

export function CharacterRelations({
  character, characters, relations,
  onSelectCharacter, onAddRelation, onRemoveRelation,
}: CharacterRelationsProps) {
  const { t } = useTranslation()

  const parents = character.parentIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => Boolean(c))
  const children = characters.filter((c) => c.parentIds.includes(character.id))
  const mine = chipsFor(relations, character.id)

  const visible = parents.length > 0 || children.length > 0 || mine.length > 0

  if (!visible && !onAddRelation) return null

  const renderChip = (name: string, imageUrl: string | null, label: string, onClick?: () => void, onRemove?: () => void) => (
    <span
      key={`${name}-${label}`}
      className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink)' }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
      ) : (
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {onClick ? (
        <button type="button" onClick={onClick} className="hover:opacity-75">{name}</button>
      ) : (
        <span>{name}</span>
      )}
      <span className="opacity-70">{label}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={t('characterApp.relRemove')} className="hover:opacity-70">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )

  return (
    <section className="character-sheet__relations mt-6" aria-labelledby="character-sheet-relations-heading">
      <div className="character-sheet__section-heading">
        <span className="character-sheet__section-mark" aria-hidden="true" />
        <h3 id="character-sheet-relations-heading">{t('characterApp.sheetRelationsHeading')}</h3>
      </div>

      <div className="mt-3 space-y-2.5">
        {(parents.length > 0 || children.length > 0) && (
          <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--color-ink-faint)' }}>
              <GitBranch className="h-3 w-3" />
              {t('characterApp.familyTree')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {parents.map((parent) => renderChip(
                parent.name, parent.imageUrl, t('characterApp.parents'),
                onSelectCharacter ? () => onSelectCharacter(parent.id) : undefined,
                undefined,
              ))}
              {children.map((child) => renderChip(
                child.name, child.imageUrl, t('characterApp.children'),
                onSelectCharacter ? () => onSelectCharacter(child.id) : undefined,
                undefined,
              ))}
            </div>
          </div>
        )}

        {RELATIONSHIP_TYPES.map((type) => {
          const typeRels = mine.filter((rel) => rel.type === type)
          if (typeRels.length === 0) return null
          const Icon = TYPE_ICONS[type]
          return (
            <div key={type} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--color-accent-violet)' }}>
                <Icon className="h-3 w-3" />
                {t(`characterApp.relType_${type}`)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {typeRels.map((rel) => {
                  const other = otherParty(rel, character.id)
                  return renderChip(
                    other.name,
                    other.imageUrl,
                    relationshipLabel(type, rel.label, t),
                    onSelectCharacter ? () => onSelectCharacter(other.id) : undefined,
                    onRemoveRelation ? () => onRemoveRelation(rel) : undefined,
                  )
                })}
              </div>
            </div>
          )
        })}

        {visible && mine.length === 0 && parents.length === 0 && children.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.relEmpty')}
          </p>
        )}
      </div>

      {onAddRelation && (
        <button
          type="button"
          onClick={onAddRelation}
          className="mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('characterApp.relAdd')}
        </button>
      )}
    </section>
  )
}
