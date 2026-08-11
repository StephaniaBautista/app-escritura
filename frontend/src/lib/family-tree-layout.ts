export const FAMILY_TREE_PERSON_WIDTH = 168
export const FAMILY_TREE_CARD_HEIGHT = 112
export const FAMILY_TREE_COUPLE_GAP = 16
export const FAMILY_TREE_SIBLING_GAP = 32
export const FAMILY_TREE_SUBTREE_GAP = 48
export const FAMILY_TREE_ROW_HEIGHT = 200
const FAMILY_TREE_PADDING = 24
const FAMILY_TREE_BRANCH_GAP = 12

export interface FamilyCharacterRef {
  id: string
  parentIds: string[]
}

export interface FamilyRelationRef {
  characterAId: string
  characterBId: string
  type: string
}

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

export interface FamilyTreeLayout {
  persons: FamilyTreePerson[]
  couples: FamilyTreeCouple[]
  branches: FamilyTreeBranch[]
  width: number
  height: number
}

interface FamilyUnit {
  id: string
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
    return { persons: [], couples: [], branches: [], width: 0, height: 0 }
  }

  const present = new Set(characters.map((c) => c.id))
  const indexOf = new Map(characters.map((c, i) => [c.id, i]))
  const parentsByChild = new Map<string, string[]>()
  const childrenByParent = new Map<string, string[]>()
  for (const c of characters) {
    const parents = [...new Set(c.parentIds.filter((p) => p !== c.id && present.has(p)))]
    parentsByChild.set(c.id, parents)
    for (const p of parents) {
      const list = childrenByParent.get(p) ?? []
      list.push(c.id)
      childrenByParent.set(p, list)
    }
  }

  const pairKey = (a: string, b: string) =>
    (indexOf.get(a) ?? 0) < (indexOf.get(b) ?? 0) ? `${a}|${b}` : `${b}|${a}`
  const pairSet = new Map<string, [string, string]>()
  const addPair = (a: string, b: string) => {
    if (a === b || !present.has(a) || !present.has(b)) return
    const key = pairKey(a, b)
    if (!pairSet.has(key)) pairSet.set(key, [a, b])
  }
  for (const r of relations) {
    if (isCoupleRelation(r.type)) addPair(r.characterAId, r.characterBId)
  }
  for (const parents of parentsByChild.values()) {
    if (parents.length === 2) {
      addPair(parents[0], parents[1])
    } else if (parents.length > 2) {
      const ordered = [...parents].sort(
        (a, b) => (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0),
      )
      for (let i = 0; i < ordered.length - 1; i += 1) addPair(ordered[i], ordered[i + 1])
    }
  }

  const partnerOf = new Map<string, string>()
  const couplePairs: [string, string][] = []
  for (const pair of pairSet.values()) {
    const [a, b] = pair
    if (partnerOf.has(a) || partnerOf.has(b)) continue
    partnerOf.set(a, b)
    partnerOf.set(b, a)
    couplePairs.push(pair)
  }

  const levelOf = new Map<string, number>()
  const pendingLevel = new Map<string, number>()
  const queue = characters
    .filter((c) => (parentsByChild.get(c.id) ?? []).length === 0)
    .map((c) => c.id)
  for (const id of queue) levelOf.set(id, 0)
  while (queue.length > 0) {
    const id = queue.shift() as string
    const level = levelOf.get(id) ?? 0
    for (const child of childrenByParent.get(id) ?? []) {
      pendingLevel.set(child, Math.max(pendingLevel.get(child) ?? 0, level + 1))
      const parents = parentsByChild.get(child) ?? []
      if (parents.every((p) => levelOf.has(p))) {
        levelOf.set(child, pendingLevel.get(child) ?? 0)
        queue.push(child)
      }
    }
  }
  let changed = true
  let guard = 0
  while (changed && guard < characters.length * 2 + 1) {
    changed = false
    guard += 1
    for (const [a, b] of couplePairs) {
      const target = Math.max(levelOf.get(a) ?? 0, levelOf.get(b) ?? 0)
      for (const id of [a, b]) {
        if ((levelOf.get(id) ?? 0) !== target) {
          levelOf.set(id, target)
          changed = true
        }
      }
    }
    for (const [child, parents] of parentsByChild) {
      const minimum = Math.max(...parents.map((p) => (levelOf.get(p) ?? 0) + 1))
      if ((levelOf.get(child) ?? 0) < minimum) {
        levelOf.set(child, minimum)
        changed = true
      }
    }
  }
  for (const c of characters) {
    if (!levelOf.has(c.id)) levelOf.set(c.id, 0)
  }

  const unitOf = new Map<string, FamilyUnit>()
  const units: FamilyUnit[] = []
  for (const c of characters) {
    if (unitOf.has(c.id)) continue
    const partner = partnerOf.get(c.id)
    const members = partner ? [c.id, partner] : [c.id]
    const unit: FamilyUnit = { id: `u-${units.length}`, members }
    for (const m of members) unitOf.set(m, unit)
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
  const unitWidth = (unit: FamilyUnit): number => {
    if (visiting.has(unit.id)) return FAMILY_TREE_PERSON_WIDTH
    const cached = unitWidthOf.get(unit.id)
    if (cached !== undefined) return cached
    visiting.add(unit.id)
    const own =
      unit.members.length === 2
        ? 2 * FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_COUPLE_GAP
        : FAMILY_TREE_PERSON_WIDTH
    const kids = childrenByUnit.get(unit.id) ?? []
    let total = own
    if (kids.length > 0) {
      const sum = kids.reduce(
        (acc, kid) => acc + unitWidth(unitOf.get(kid) as FamilyUnit),
        0,
      )
      total = Math.max(own, sum + FAMILY_TREE_SIBLING_GAP * (kids.length - 1))
    }
    visiting.delete(unit.id)
    unitWidthOf.set(unit.id, total)
    return total
  }

  const centerXOf = new Map<string, number>()
  const placeUnit = (unit: FamilyUnit, centerX: number) => {
    if (centerXOf.has(unit.members[0])) return
    if (unit.members.length === 2) {
      centerXOf.set(
        unit.members[0],
        centerX - FAMILY_TREE_PERSON_WIDTH / 2 - FAMILY_TREE_COUPLE_GAP / 2,
      )
      centerXOf.set(
        unit.members[1],
        centerX + FAMILY_TREE_PERSON_WIDTH / 2 + FAMILY_TREE_COUPLE_GAP / 2,
      )
    } else {
      centerXOf.set(unit.members[0], centerX)
    }
    const kids = childrenByUnit.get(unit.id) ?? []
    if (kids.length === 0) return
    const kidsTotal = kids.reduce(
      (acc, kid) => acc + unitWidth(unitOf.get(kid) as FamilyUnit),
      0,
    )
    const span = unitWidth(unit)
    const blockWidth = kidsTotal + FAMILY_TREE_SIBLING_GAP * (kids.length - 1)
    const extraGap = (span - blockWidth) / Math.max(kids.length - 1, 1)
    let cursor = centerX - blockWidth / 2
    for (const kid of kids) {
      const kidUnit = unitOf.get(kid) as FamilyUnit
      const kidWidth = unitWidth(kidUnit)
      placeUnit(kidUnit, cursor + kidWidth / 2)
      cursor += kidWidth + FAMILY_TREE_SIBLING_GAP + extraGap
    }
  }

  const rootUnits = units
    .filter((u) => !u.members.some((m) => (parentsByChild.get(m) ?? []).length > 0))
    .sort(
      (u1, u2) =>
        (indexOf.get(u1.members[0]) ?? 0) - (indexOf.get(u2.members[0]) ?? 0),
    )
  let cursor = 0
  for (const unit of rootUnits) {
    placeUnit(unit, cursor + unitWidth(unit) / 2)
    cursor += unitWidth(unit) + FAMILY_TREE_SUBTREE_GAP
  }
  for (const unit of units) {
    if (centerXOf.has(unit.members[0])) continue
    placeUnit(unit, cursor + unitWidth(unit) / 2)
    cursor += unitWidth(unit) + FAMILY_TREE_SUBTREE_GAP
  }

  let minLeft = Infinity
  let maxRight = -Infinity
  for (const c of characters) {
    const cx = centerXOf.get(c.id) ?? 0
    minLeft = Math.min(minLeft, cx - FAMILY_TREE_PERSON_WIDTH / 2)
    maxRight = Math.max(maxRight, cx + FAMILY_TREE_PERSON_WIDTH / 2)
  }
  const offsetX = -minLeft + FAMILY_TREE_PADDING
  const maxLevel = Math.max(0, ...characters.map((c) => levelOf.get(c.id) ?? 0))
  const cardTopAt = (level: number) => FAMILY_TREE_PADDING + level * FAMILY_TREE_ROW_HEIGHT

  const persons: FamilyTreePerson[] = characters.map((c) => {
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

  return {
    persons,
    couples,
    branches,
    width: maxRight - minLeft + FAMILY_TREE_PADDING * 2,
    height: cardTopAt(maxLevel) + FAMILY_TREE_CARD_HEIGHT + FAMILY_TREE_PADDING,
  }
}
