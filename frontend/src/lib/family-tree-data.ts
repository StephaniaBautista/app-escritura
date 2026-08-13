import {
  FAMILY_TREE_UNKNOWN_PARENT_PREFIX,
  type FamilyCharacterRef,
  type FamilyRelationRef,
} from './family-tree-types'

const SIBLING_KINSHIP = new Set([
  'hermana', 'hermano', 'hermanas', 'hermanos',
  'hermana gemela', 'hermano gemelo', 'hermanas gemelas', 'hermanos gemelos',
  'media hermana', 'medio hermano', 'medias hermanas', 'medios hermanos',
  'sister', 'brother', 'sisters', 'brothers',
  'twin sister', 'twin brother', 'twin sisters', 'twin brothers',
  'half sister', 'half brother', 'half sisters', 'half brothers',
])
const COUSIN_KINSHIP = new Set([
  'primo', 'prima', 'primos', 'primas', 'primo hermano', 'prima hermana',
  'cousin', 'cousins', 'first cousin', 'first cousins',
])

function kinshipVariants(label: string): string[] {
  const trimmed = label.trim().toLowerCase().replace(/\s+/g, ' ')
  return [trimmed, ...trimmed.split('/')]
}

export function isSiblingRelation(relation: FamilyRelationRef): boolean {
  if (relation.type !== 'family') return false
  return kinshipVariants(relation.label ?? '').some((variant) => SIBLING_KINSHIP.has(variant))
}

export function isCousinRelation(relation: FamilyRelationRef): boolean {
  if (relation.type !== 'family') return false
  return kinshipVariants(relation.label ?? '').some((variant) => COUSIN_KINSHIP.has(variant))
}

export interface FamilyTreeModel {
  layoutCharacters: FamilyCharacterRef[]
  indexOf: Map<string, number>
  parentsByChild: Map<string, string[]>
  childrenByParent: Map<string, string[]>
  couplePairs: [string, string][]
  siblingGroups: string[][]
  cousinGroups: string[][]
  siblingLabelOf: Map<string, string>
  cousinLabelOf: Map<string, string>
  componentOf: Map<string, number>
  partnerOf: Map<string, string>
  levelOf: Map<string, number>
}

function unionGroups(pairs: [string, string][]): string[][] {
  const parent = new Map<string, string>()
  const findRoot = (id: string): string => {
    let root = id
    while (parent.get(root) !== undefined && parent.get(root) !== root) {
      root = parent.get(root) as string
    }
    let current = id
    while (parent.get(current) !== undefined && parent.get(current) !== current) {
      const next = parent.get(current) as string
      parent.set(current, root)
      current = next
    }
    return root
  }
  const union = (a: string, b: string) => {
    const rootA = findRoot(a)
    const rootB = findRoot(b)
    if (rootA !== rootB) parent.set(rootB, rootA)
  }
  for (const [a, b] of pairs) union(a, b)
  const grouped = new Map<string, string[]>()
  for (const member of new Set(pairs.flat())) {
    const root = findRoot(member)
    const group = grouped.get(root) ?? []
    group.push(member)
    grouped.set(root, group)
  }
  return [...grouped.values()]
}

export function buildFamilyModel(
  characters: FamilyCharacterRef[],
  relations: FamilyRelationRef[],
): FamilyTreeModel {
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
  const addPair = (a: string, b: string, target: Map<string, [string, string]>) => {
    if (a === b || !present.has(a) || !present.has(b)) return
    const key = pairKey(a, b)
    if (!target.has(key)) target.set(key, [a, b])
  }
  for (const r of relations) {
    if (r.type === 'romance') addPair(r.characterAId, r.characterBId, pairSet)
  }
  for (const parents of parentsByChild.values()) {
    if (parents.length === 2) {
      addPair(parents[0], parents[1], pairSet)
    } else if (parents.length > 2) {
      const ordered = [...parents].sort(
        (a, b) => (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0),
      )
      for (let i = 0; i < ordered.length - 1; i += 1) addPair(ordered[i], ordered[i + 1], pairSet)
    }
  }
  const syntheticCharacters: FamilyCharacterRef[] = []
  for (const c of characters) {
    if ((childrenByParent.get(c.id) ?? []).length === 0) continue
    const hasPartner = [...pairSet.values()].some(
      ([a, b]) => a === c.id || b === c.id,
    )
    if (hasPartner) continue
    const syntheticId = `${FAMILY_TREE_UNKNOWN_PARENT_PREFIX}${c.id}`
    syntheticCharacters.push({ id: syntheticId, parentIds: [] })
    present.add(syntheticId)
    indexOf.set(syntheticId, indexOf.size)
    addPair(c.id, syntheticId, pairSet)
  }
  const layoutCharacters = [...characters, ...syntheticCharacters]

  const siblingPairSet = new Map<string, [string, string]>()
  const siblingLabelOf = new Map<string, string>()
  for (const r of relations) {
    if (!isSiblingRelation(r)) continue
    addPair(r.characterAId, r.characterBId, siblingPairSet)
    const label = r.label?.trim() ?? ''
    if (!siblingLabelOf.has(r.characterAId)) siblingLabelOf.set(r.characterAId, label)
    if (!siblingLabelOf.has(r.characterBId)) siblingLabelOf.set(r.characterBId, label)
  }
  const siblingGroups = unionGroups([...siblingPairSet.values()])

  const cousinPairSet = new Map<string, [string, string]>()
  const cousinLabelOf = new Map<string, string>()
  for (const r of relations) {
    if (!isCousinRelation(r)) continue
    addPair(r.characterAId, r.characterBId, cousinPairSet)
    const label = r.label?.trim() ?? ''
    if (!cousinLabelOf.has(r.characterAId)) cousinLabelOf.set(r.characterAId, label)
    if (!cousinLabelOf.has(r.characterBId)) cousinLabelOf.set(r.characterBId, label)
  }
  const grandparentsOf = (id: string): Set<string> => {
    const result = new Set<string>()
    for (const parent of parentsByChild.get(id) ?? []) {
      for (const grandparent of parentsByChild.get(parent) ?? []) result.add(grandparent)
    }
    return result
  }
  for (const a of characters) {
    for (const b of characters) {
      if (a.id === b.id) continue
      const parentOfA = parentsByChild.get(a.id) ?? []
      const parentOfB = parentsByChild.get(b.id) ?? []
      if (parentOfA.includes(b.id) || parentOfB.includes(a.id)) continue
      if (parentOfA.some((p) => parentOfB.includes(p))) continue
      const sharedGrandparent = [...grandparentsOf(a.id)].some((g) =>
        grandparentsOf(b.id).has(g))
      if (sharedGrandparent) addPair(a.id, b.id, cousinPairSet)
    }
  }
  const cousinGroups = unionGroups([...cousinPairSet.values()])

  const componentOf = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  const addEdge = (a: string, b: string) => {
    const list = adjacency.get(a) ?? []
    list.push(b)
    adjacency.set(a, list)
  }
  const connect = (a: string, b: string) => {
    if (a === b || !present.has(a) || !present.has(b)) return
    addEdge(a, b)
    addEdge(b, a)
  }
  for (const c of characters) {
    for (const p of parentsByChild.get(c.id) ?? []) connect(c.id, p)
  }
  for (const pair of pairSet.values()) connect(pair[0], pair[1])
  for (const pair of siblingPairSet.values()) connect(pair[0], pair[1])
  for (const pair of cousinPairSet.values()) connect(pair[0], pair[1])
  let nextComponent = 0
  for (const c of layoutCharacters) {
    if (componentOf.has(c.id)) continue
    const queue = [c.id]
    componentOf.set(c.id, nextComponent)
    for (let i = 0; i < queue.length; i += 1) {
      for (const n of adjacency.get(queue[i]) ?? []) {
        if (componentOf.has(n)) continue
        componentOf.set(n, nextComponent)
        queue.push(n)
      }
    }
    nextComponent += 1
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
  const queue = layoutCharacters
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
  while (changed && guard < layoutCharacters.length * 2 + 1) {
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
    for (const group of siblingGroups) {
      const target = Math.max(...group.map((m) => levelOf.get(m) ?? 0))
      for (const m of group) {
        if ((levelOf.get(m) ?? 0) !== target) {
          levelOf.set(m, target)
          changed = true
        }
      }
    }
    for (const group of cousinGroups) {
      const target = Math.max(...group.map((m) => levelOf.get(m) ?? 0))
      for (const m of group) {
        if ((levelOf.get(m) ?? 0) !== target) {
          levelOf.set(m, target)
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
  for (const c of layoutCharacters) {
    if (!levelOf.has(c.id)) levelOf.set(c.id, 0)
  }

  return {
    layoutCharacters,
    indexOf,
    parentsByChild,
    childrenByParent,
    couplePairs,
    siblingGroups,
    cousinGroups,
    siblingLabelOf,
    cousinLabelOf,
    componentOf,
    partnerOf,
    levelOf,
  }
}
