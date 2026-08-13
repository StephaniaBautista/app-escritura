import { useMemo, useState } from 'react'
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

function CoupleMark({ couple, opacity }: { couple: FamilyTreeCouple; opacity: number }) {
  const { t } = useTranslation()
  return (
    <g data-testid="family-couple-bar" style={{ opacity }} className="transition-opacity duration-150">
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

function BarMark({
  firstX,
  lastX,
  centerX,
  barY,
  label,
  color,
  opacity,
  testId,
  testIds,
}: {
  firstX: number
  lastX: number
  centerX: number
  barY: number
  label: string
  color: string
  opacity: number
  testId: string
  testIds: string
}) {
  return (
    <g data-testid={testId} data-member-ids={testIds} style={{ opacity }} className="transition-opacity duration-150">
      <line x1={firstX} y1={barY} x2={firstX} y2={barY - 10} stroke={color} strokeWidth={2} />
      <line x1={lastX} y1={barY} x2={lastX} y2={barY - 10} stroke={color} strokeWidth={2} />
      <line x1={firstX} y1={barY} x2={lastX} y2={barY} stroke={color} strokeWidth={2} />
      <text x={centerX} y={barY - 14} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}>
        {label}
      </text>
    </g>
  )
}

function UnknownParentCard() {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col items-center rounded-xl border-2 border-dashed bg-(--color-paper) px-2 pb-2 pt-2 text-center"
      style={{
        width: FAMILY_TREE_PERSON_WIDTH,
        minHeight: FAMILY_TREE_CARD_HEIGHT,
        borderColor: 'var(--color-paper-lines)',
      }}
      data-testid="unknown-parent-card"
    >
      <div
        className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
      >
        <span className="text-xs font-bold" style={{ color: 'var(--color-ink-faint)' }}>?</span>
      </div>
      <p className="w-full truncate text-sm font-semibold" style={{ color: 'var(--color-ink-faint)' }}>
        {t('diagramApp.unknownParent')}
      </p>
    </div>
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
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const layout = useMemo(() => buildFamilyLayout(characters, relations), [characters, relations])
  const personById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])
  const childrenOf = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const character of characters) {
      for (const parentId of character.parentIds) {
        const list = map.get(parentId) ?? []
        list.push(character.id)
        map.set(parentId, list)
      }
    }
    return map
  }, [characters])
  const parentsOf = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const character of characters) map.set(character.id, character.parentIds)
    return map
  }, [characters])

  const isPersonRelated = (id: string): boolean => {
    if (!hoveredId) return true
    if (id === hoveredId) return true
    if ((parentsOf.get(hoveredId) ?? []).includes(id)) return true
    if ((childrenOf.get(hoveredId) ?? []).includes(id)) return true
    if (layout.couples.some((couple) =>
      (couple.aId === hoveredId && couple.bId === id) || (couple.bId === hoveredId && couple.aId === id))) return true
    if (layout.siblingMarks.some((mark) =>
      mark.memberIds.includes(hoveredId) && mark.memberIds.includes(id))) return true
    if (layout.cousinMarks.some((mark) =>
      mark.memberIds.includes(hoveredId) && mark.memberIds.includes(id))) return true
    return false
  }

  const isBranchRelated = (branch: FamilyTreeBranch): boolean => {
    if (!hoveredId) return true
    return branch.children.some((child) =>
      child.id === hoveredId
      || (childrenOf.get(hoveredId) ?? []).includes(child.id)
      || (parentsOf.get(child.id) ?? []).includes(hoveredId))
  }

  const markOpacity = (members: string[]) => {
    if (!hoveredId) return 1
    return members.includes(hoveredId) ? 1 : 0.12
  }

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
      className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border"
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
      data-testid="family-tree"
    >
      <div className="relative min-w-full" style={{ width: layout.width, height: layout.height }}>
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
              opacity={isBranchRelated(branch) ? 1 : 0.12}
              className="transition-opacity duration-150"
            />
          ))}
          {layout.couples.map((couple) => (
            <CoupleMark
              key={`couple-${couple.aId}-${couple.bId}`}
              couple={couple}
              opacity={markOpacity([couple.aId, couple.bId])}
            />
          ))}
          {layout.siblingMarks.map((mark) => (
            <BarMark
              key={`siblings-${mark.memberIds.join('-')}`}
              firstX={mark.firstX}
              lastX={mark.lastX}
              centerX={mark.centerX}
              barY={mark.barY}
              label={mark.label ?? t('diagramApp.siblings')}
              color="var(--color-accent-teal)"
              opacity={markOpacity(mark.memberIds)}
              testId="family-sibling-bar"
              testIds={mark.memberIds.slice().sort().join(',')}
            />
          ))}
          {layout.cousinMarks.map((mark) => (
            <BarMark
              key={`cousins-${mark.memberIds.join('-')}`}
              firstX={mark.firstX}
              lastX={mark.lastX}
              centerX={mark.centerX}
              barY={mark.barY}
              label={mark.label ?? t('diagramApp.cousins')}
              color="var(--color-accent-violet)"
              opacity={markOpacity(mark.memberIds)}
              testId="family-cousin-bar"
              testIds={mark.memberIds.slice().sort().join(',')}
            />
          ))}
        </svg>
        {layout.persons.map((person) => {
          const character = personById.get(person.id)
          const isUnknownParent = !character
          return (
            <div
              key={person.id}
              className="absolute transition-opacity duration-150"
              style={{
                left: person.centerX - FAMILY_TREE_PERSON_WIDTH / 2,
                top: person.cardTop,
                opacity: hoveredId ? (isPersonRelated(person.id) ? 1 : 0.3) : 1,
              }}
              onMouseEnter={() => setHoveredId(person.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {isUnknownParent ? <UnknownParentCard /> : <PersonCard character={character as Character} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
