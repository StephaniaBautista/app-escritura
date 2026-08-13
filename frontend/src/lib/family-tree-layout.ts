export const FAMILY_TREE_PERSON_WIDTH = 168
export const FAMILY_TREE_CARD_HEIGHT = 112
export const FAMILY_TREE_COUPLE_GAP = 16
export const FAMILY_TREE_SIBLING_GAP = 32
export const FAMILY_TREE_SIBLING_BAR_GAP = 16
export const FAMILY_TREE_COUSIN_BAR_GAP = 16
export const FAMILY_TREE_SUBTREE_GAP = 48
export const FAMILY_TREE_COMPONENT_GAP = 160
export const FAMILY_TREE_ROW_HEIGHT = 200
const FAMILY_TREE_PADDING = 24
const FAMILY_TREE_BRANCH_GAP = 12
export type { FamilyCharacterRef, FamilyRelationRef } from './family-tree-types'
export { FAMILY_TREE_UNKNOWN_PARENT_PREFIX } from './family-tree-types'
export { isSiblingRelation, isCousinRelation } from './family-tree-data'
import type { FamilyCharacterRef, FamilyRelationRef } from './family-tree-types'
import { buildFamilyModel } from './family-tree-data'
export interface FamilyTreePerson {
  id: string
  level: number
  centerX: number
  cardTop: number
  partnerId: string | null
}
export interface FamilyTreeCouple {
  aId: string
  bId: string
  aCenterX: number
  bCenterX: number
  centerX: number
  barY: number
}
export interface FamilyTreeBranch {
  anchorX: number
  anchorY: number
  children: { id: string; centerX: number; childTopY: number }[]
}
export interface FamilyTreeSiblingMark {
  memberIds: string[]
  firstX: number
  lastX: number
  centerX: number
  barY: number
  label: string | null
}
export interface FamilyTreeCousinMark {
  memberIds: string[]
  firstX: number
  lastX: number
  centerX: number
  barY: number
  label: string | null
}
export interface FamilyTreeLayout {
  persons: FamilyTreePerson[]
  couples: FamilyTreeCouple[]
  siblingMarks: FamilyTreeSiblingMark[]
  cousinMarks: FamilyTreeCousinMark[]
  branches: FamilyTreeBranch[]
  width: number
  height: number
}
interface FamilyUnit {
  id: string
  kind: 'single' | 'couple' | 'siblings'
  members: string[]
}
export function isCoupleRelation(type: string): boolean {
  return type === 'romance'
}
export function buildFamilyLayout(
  characters: FamilyCharacterRef[],
  relations: FamilyRelationRef[],
): FamilyTreeLayout {
  if (characters.length === 0) {
    return { persons: [], couples: [], siblingMarks: [], cousinMarks: [], branches: [], width: 0, height: 0 }
  }
  const {
    layoutCharacters,
    indexOf,
    parentsByChild,
    couplePairs,
    siblingGroups,
    cousinGroups,
    siblingLabelOf,
    cousinLabelOf,
    componentOf,
    partnerOf,
    levelOf,
  } = buildFamilyModel(characters, relations)

  const unitOf = new Map<string, FamilyUnit>()
  const units: FamilyUnit[] = []
  for (const [a, b] of couplePairs) {
    if (unitOf.has(a) || unitOf.has(b)) continue
    const unit: FamilyUnit = { id: `u-${units.length}`, kind: 'couple', members: [a, b] }
    unitOf.set(a, unit)
    unitOf.set(b, unit)
    units.push(unit)
  }
  for (const c of layoutCharacters) {
    if (unitOf.has(c.id)) continue
    const group = siblingGroups.find((g) => g.includes(c.id))
    if (group) {
      const free = group.filter((m) => !unitOf.has(m))
      const members = free.length >= 2 ? free : [c.id]
      const unit: FamilyUnit = {
        id: `u-${units.length}`,
        kind: members.length >= 2 ? 'siblings' : 'single',
        members,
      }
      for (const m of members) unitOf.set(m, unit)
      units.push(unit)
      continue
    }
    const unit: FamilyUnit = { id: `u-${units.length}`, kind: 'single', members: [c.id] }
    unitOf.set(c.id, unit)
    units.push(unit)
  }

  const childrenByUnit = new Map<string, string[]>()
  for (const [child, parents] of parentsByChild) {
    const unit = unitOf.get(parents[0])
    if (!unit) continue
    const list = childrenByUnit.get(unit.id) ?? []
    list.push(child)
    childrenByUnit.set(unit.id, list)
  }

  const unitWidthOf = new Map<string, number>()
  const visiting = new Set<string>()
  const unitCardWidth = (unit: FamilyUnit): number =>
    unit.kind === 'couple'
      ? 2 * FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_COUPLE_GAP
      : unit.kind === 'siblings'
        ? unit.members.length * FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_SIBLING_GAP * (unit.members.length - 1)
        : FAMILY_TREE_PERSON_WIDTH
  const unitWidth = (unit: FamilyUnit): number => {
    if (visiting.has(unit.id)) return FAMILY_TREE_PERSON_WIDTH
    const cached = unitWidthOf.get(unit.id)
    if (cached !== undefined) return cached
    visiting.add(unit.id)
    const own = unitCardWidth(unit)
    const kids = childrenByUnit.get(unit.id) ?? []
    let total = own
    if (kids.length > 0) {
      const kidUnits = [...new Set(kids.map((k) => unitOf.get(k) as FamilyUnit))]
      const sum = kidUnits.reduce((acc, kid) => acc + unitWidth(kid), 0)
      total = Math.max(own, sum + FAMILY_TREE_SIBLING_GAP * (kidUnits.length - 1))
    }
    visiting.delete(unit.id)
    unitWidthOf.set(unit.id, total)
    return total
  }

  const centerXOf = new Map<string, number>()
  const occupiedByLevel = new Map<number, { left: number; right: number }[]>()
  const memberOffsets = (unit: FamilyUnit): { id: string; offset: number }[] => {
    if (unit.kind === 'couple') {
      return [
        { id: unit.members[0], offset: -FAMILY_TREE_PERSON_WIDTH / 2 - FAMILY_TREE_COUPLE_GAP / 2 },
        { id: unit.members[1], offset: FAMILY_TREE_PERSON_WIDTH / 2 + FAMILY_TREE_COUPLE_GAP / 2 },
      ]
    }
    if (unit.kind === 'siblings') {
      const totalWidth = unitCardWidth(unit)
      let cursor = -totalWidth / 2
      return unit.members.map((id) => {
        const offset = cursor + FAMILY_TREE_PERSON_WIDTH / 2
        cursor += FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_SIBLING_GAP
        return { id, offset }
      })
    }
    return [{ id: unit.members[0], offset: 0 }]
  }
  const reserveUnitCenter = (unit: FamilyUnit, requestedCenterX: number): number => {
    const offsets = memberOffsets(unit)
    let centerX = requestedCenterX
    let requiredCenter: number | null = null
    do {
      requiredCenter = null
      for (const { id, offset } of offsets) {
        const level = levelOf.get(id) ?? 0
        const occupied = occupiedByLevel.get(level) ?? []
        const left = centerX + offset - FAMILY_TREE_PERSON_WIDTH / 2
        const right = centerX + offset + FAMILY_TREE_PERSON_WIDTH / 2
        for (const interval of occupied) {
          if (left < interval.right + FAMILY_TREE_SIBLING_GAP && right > interval.left - FAMILY_TREE_SIBLING_GAP) {
            const candidate = interval.right + FAMILY_TREE_SIBLING_GAP + FAMILY_TREE_PERSON_WIDTH / 2 - offset
            requiredCenter = Math.max(requiredCenter ?? candidate, candidate)
          }
        }
      }
      if (requiredCenter !== null) centerX = requiredCenter
    } while (requiredCenter !== null)

    for (const { id, offset } of offsets) {
      const level = levelOf.get(id) ?? 0
      const occupied = occupiedByLevel.get(level) ?? []
      occupied.push({
        left: centerX + offset - FAMILY_TREE_PERSON_WIDTH / 2,
        right: centerX + offset + FAMILY_TREE_PERSON_WIDTH / 2,
      })
      occupiedByLevel.set(level, occupied)
    }
    return centerX
  }
  const placeUnit = (unit: FamilyUnit, centerX: number) => {
    if (centerXOf.has(unit.members[0])) return
    const placedCenterX = reserveUnitCenter(unit, centerX)
    if (unit.kind === 'couple') {
      centerXOf.set(
        unit.members[0],
        placedCenterX - FAMILY_TREE_PERSON_WIDTH / 2 - FAMILY_TREE_COUPLE_GAP / 2,
      )
      centerXOf.set(
        unit.members[1],
        placedCenterX + FAMILY_TREE_PERSON_WIDTH / 2 + FAMILY_TREE_COUPLE_GAP / 2,
      )
    } else if (unit.kind === 'siblings') {
      const totalWidth = unitCardWidth(unit)
      let cursor = placedCenterX - totalWidth / 2
      for (const m of unit.members) {
        centerXOf.set(m, cursor + FAMILY_TREE_PERSON_WIDTH / 2)
        cursor += FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_SIBLING_GAP
      }
    } else {
      centerXOf.set(unit.members[0], placedCenterX)
    }
    const kids = childrenByUnit.get(unit.id) ?? []
    if (kids.length === 0) return
    const kidUnits = [...new Set(kids.map((k) => unitOf.get(k) as FamilyUnit))]
    const kidsTotal = kidUnits.reduce((acc, kid) => acc + unitWidth(kid), 0)
    const span = unitWidth(unit)
    const blockWidth = kidsTotal + FAMILY_TREE_SIBLING_GAP * (kidUnits.length - 1)
    const extraGap = (span - blockWidth) / Math.max(kidUnits.length - 1, 1)
    let cursor = placedCenterX - blockWidth / 2
    for (const kid of kidUnits) {
      const kidWidth = unitWidth(kid)
      placeUnit(kid, cursor + kidWidth / 2)
      cursor += kidWidth + FAMILY_TREE_SIBLING_GAP + extraGap
    }
  }

  const rootUnits = units
    .filter((u) => !u.members.some((m) => (parentsByChild.get(m) ?? []).length > 0))
    .sort((u1, u2) => {
      const comp1 = componentOf.get(u1.members[0]) ?? 0
      const comp2 = componentOf.get(u2.members[0]) ?? 0
      return (
        comp1 - comp2 ||
        (indexOf.get(u1.members[0]) ?? 0) - (indexOf.get(u2.members[0]) ?? 0)
      )
    })
  const gapAfter = (unit: FamilyUnit, prev: FamilyUnit | undefined) => {
    if (!prev) return 0
    return (componentOf.get(prev.members[0]) ?? 0) ===
      (componentOf.get(unit.members[0]) ?? 0)
      ? FAMILY_TREE_SUBTREE_GAP
      : FAMILY_TREE_COMPONENT_GAP
  }
  let cursor = 0
  let prevUnit: FamilyUnit | undefined
  for (const unit of rootUnits) {
    cursor += gapAfter(unit, prevUnit)
    placeUnit(unit, cursor + unitWidth(unit) / 2)
    cursor += unitWidth(unit)
    prevUnit = unit
  }
  for (const unit of units) {
    if (centerXOf.has(unit.members[0])) continue
    cursor += gapAfter(unit, prevUnit)
    placeUnit(unit, cursor + unitWidth(unit) / 2)
    cursor += unitWidth(unit)
    prevUnit = unit
  }

  let minLeft = Infinity
  let maxRight = -Infinity
  for (const c of layoutCharacters) {
    const cx = centerXOf.get(c.id) ?? 0
    minLeft = Math.min(minLeft, cx - FAMILY_TREE_PERSON_WIDTH / 2)
    maxRight = Math.max(maxRight, cx + FAMILY_TREE_PERSON_WIDTH / 2)
  }
  const offsetX = -minLeft + FAMILY_TREE_PADDING
  const maxLevel = Math.max(0, ...layoutCharacters.map((c) => levelOf.get(c.id) ?? 0))
  const cardTopAt = (level: number) => FAMILY_TREE_PADDING + level * FAMILY_TREE_ROW_HEIGHT

  const persons: FamilyTreePerson[] = layoutCharacters.map((c) => {
    const level = levelOf.get(c.id) ?? 0
    return {
      id: c.id,
      level,
      centerX: (centerXOf.get(c.id) ?? 0) + offsetX,
      cardTop: cardTopAt(level),
      partnerId: partnerOf.get(c.id) ?? null,
    }
  })

  const personById = new Map(persons.map((p) => [p.id, p]))
  const couples: FamilyTreeCouple[] = couplePairs.map(([aId, bId]) => {
    const a = personById.get(aId) as FamilyTreePerson
    const b = personById.get(bId) as FamilyTreePerson
    return {
      aId,
      bId,
      aCenterX: a.centerX,
      bCenterX: b.centerX,
      centerX: (a.centerX + b.centerX) / 2,
      barY: a.cardTop + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_BRANCH_GAP,
    }
  })

  const siblingMarks: FamilyTreeSiblingMark[] = siblingGroups.map((group) => {
    const members = group.map((m) => personById.get(m) as FamilyTreePerson)
    const xs = members.map((m) => m.centerX)
    return {
      memberIds: group,
      firstX: Math.min(...xs),
      lastX: Math.max(...xs),
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
      barY: members[0].cardTop + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_BRANCH_GAP + FAMILY_TREE_SIBLING_BAR_GAP,
      label: siblingLabelOf.get(group[0]) ?? null,
    }
  })

  const cousinMarks: FamilyTreeCousinMark[] = cousinGroups.map((group) => {
    const members = group.map((m) => personById.get(m) as FamilyTreePerson)
    const xs = members.map((m) => m.centerX)
    return {
      memberIds: group,
      firstX: Math.min(...xs),
      lastX: Math.max(...xs),
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
      barY: members[0].cardTop + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_BRANCH_GAP
        + FAMILY_TREE_SIBLING_BAR_GAP + FAMILY_TREE_COUSIN_BAR_GAP,
      label: cousinLabelOf.get(group[0]) ?? null,
    }
  })

  const branches: FamilyTreeBranch[] = units.flatMap((unit) => {
    const kids = childrenByUnit.get(unit.id) ?? []
    if (kids.length === 0) return []
    const memberLevel = levelOf.get(unit.members[0]) ?? 0
    const anchorX =
      unit.members.length === 2
        ? ((centerXOf.get(unit.members[0]) ?? 0) + (centerXOf.get(unit.members[1]) ?? 0)) /
            2 +
          offsetX
        : (centerXOf.get(unit.members[0]) ?? 0) + offsetX
    return [
      {
        anchorX,
        anchorY: cardTopAt(memberLevel) + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_BRANCH_GAP,
        children: kids.map((kid) => {
          const p = personById.get(kid) as FamilyTreePerson
          return { id: kid, centerX: p.centerX, childTopY: p.cardTop }
        }),
      },
    ]
  })

  const marksBottomSpace =
    siblingGroups.length > 0 || cousinGroups.length > 0
      ? FAMILY_TREE_BRANCH_GAP
        + FAMILY_TREE_SIBLING_BAR_GAP * (1 + (cousinGroups.length > 0 ? 1 : 0))
      : 0

  return {
    persons,
    couples,
    siblingMarks,
    cousinMarks,
    branches,
    width: maxRight - minLeft + FAMILY_TREE_PADDING * 2,
    height: cardTopAt(maxLevel) + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_PADDING + marksBottomSpace,
  }
}
