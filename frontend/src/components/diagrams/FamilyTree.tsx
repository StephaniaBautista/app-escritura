import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import type { Character } from '@/types/character'
import type { CharacterRelationship } from '@/types/relationship'
import {
  buildFamilyLayout,
  FAMILY_TREE_CARD_HEIGHT,
  FAMILY_TREE_PERSON_WIDTH,
  type FamilyTreeBranch,
  type FamilyTreeCouple,
} from '@/lib/family-tree-layout'

interface FamilyTreeProps {
  characters: Character[]
  relations: CharacterRelationship[]
}

function branchPath(branch: FamilyTreeBranch): string {
  const rowY =
    branch.anchorY + Math.round((branch.children[0].childTopY - branch.anchorY) / 2)
  let path = `M ${branch.anchorX} ${branch.anchorY} V ${rowY}`
  for (const child of branch.children) {
    path += ` M ${branch.anchorX} ${rowY} H ${child.centerX} V ${child.childTopY}`
  }
  return path
}

function CoupleMark({ couple }: { couple: FamilyTreeCouple }) {
  const { t } = useTranslation()
  return (
    <g data-testid="family-couple-bar">
      <line x1={couple.aCenterX} y1={couple.barY} x2={couple.aCenterX} y2={couple.barY - 12} stroke="var(--color-romance)" strokeWidth={2} />
      <line x1={couple.bCenterX} y1={couple.barY} x2={couple.bCenterX} y2={couple.barY - 12} stroke="var(--color-romance)" strokeWidth={2} />
      <line
        x1={couple.aCenterX}
        y1={couple.barY}
        x2={couple.bCenterX}
        y2={couple.barY}
        stroke="var(--color-romance)"
        strokeWidth={2}
      />
      <g transform={`translate(${couple.centerX - 7}, ${couple.barY - 7})`}>
        <title>{t('diagramApp.couple')}</title>
        <Heart
          width={14}
          height={14}
          fill="var(--color-romance)"
          stroke="var(--color-paper)"
          strokeWidth={1.5}
        />
      </g>
    </g>
  )
}

function PersonCard({ character }: { character: Character }) {
  const initials = character.name.slice(0, 2).toUpperCase()
  return (
    <div
      className="flex flex-col items-center rounded-xl border-2 bg-(--color-paper) px-2 pb-2 pt-2 text-center shadow-sm"
      style={{
        width: FAMILY_TREE_PERSON_WIDTH,
        minHeight: FAMILY_TREE_CARD_HEIGHT,
        borderColor: 'var(--color-paper-lines)',
      }}
      data-testid="family-tree-person"
    >
      <div
        className="mb-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-accent-violet-light)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold" style={{ color: 'var(--color-accent-violet)' }}>
            {initials}
          </span>
        )}
      </div>
      <p className="w-full truncate text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
        {character.name}
      </p>
      {character.role && (
        <p className="w-full truncate text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
          {character.role}
        </p>
      )}
    </div>
  )
}

export function FamilyTree({ characters, relations }: FamilyTreeProps) {
  const { t } = useTranslation()
  const layout = useMemo(() => buildFamilyLayout(characters, relations), [characters, relations])
  const personById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])

  if (layout.persons.length === 0) {
    return (
      <div
        className="rounded-2xl border p-10 text-center"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('diagramApp.noCharacters')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="overflow-auto rounded-2xl border"
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
      data-testid="family-tree"
    >
      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.branches.map((branch, index) => (
            <path
              key={`branch-${index}`}
              d={branchPath(branch)}
              fill="none"
              stroke="var(--color-paper-lines)"
              strokeWidth={1.5}
            />
          ))}
          {layout.couples.map((couple) => (
            <CoupleMark key={`couple-${couple.aId}-${couple.bId}`} couple={couple} />
          ))}
        </svg>
        {layout.persons.map((person) => (
          <div
            key={person.id}
            className="absolute"
            style={{
              left: person.centerX - FAMILY_TREE_PERSON_WIDTH / 2,
              top: person.cardTop,
            }}
          >
            <PersonCard character={personById.get(person.id) as Character} />
          </div>
        ))}
      </div>
    </div>
  )
}
