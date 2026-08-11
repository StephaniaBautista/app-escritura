import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'

export const DIAGRAM_TYPES = ['familyTree', 'relationships', 'custom'] as const
export type DiagramType = typeof DIAGRAM_TYPES[number]

export interface DiagramLayoutNode {
  id: string
  position: { x: number; y: number }
}

export interface DiagramLayoutNote {
  id: string
  position: { x: number; y: number }
  text: string
}

export interface DiagramLayout {
  nodes: DiagramLayoutNode[]
  notes: DiagramLayoutNote[]
}

export interface DiagramInput {
  name?: string
  type?: DiagramType
  layout?: Partial<DiagramLayout>
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

export function emptyLayout(): DiagramLayout {
  return { nodes: [], notes: [] }
}

function layeredFamilyLayout(
  characters: { id: string; parentIds: string[] }[],
): DiagramLayoutNode[] {
  const familyNodeStep = 240
  const familyLevelStep = 180
  const charById = new Map(characters.map((c) => [c.id, c]))
  const childByParent = new Map<string, string[]>()
  const parentCount = new Map<string, number>()
  const parentIdsByChild = new Map<string, string[]>()
  for (const c of characters) {
    const parentIds = [...new Set(c.parentIds.filter((parentId) => charById.has(parentId)))]
    parentCount.set(c.id, parentIds.length)
    parentIdsByChild.set(c.id, parentIds)
    for (const p of parentIds) {
      const list = childByParent.get(p) ?? []
      list.push(c.id)
      childByParent.set(p, list)
    }
  }
  const levelOf = new Map<string, number>()
  const pendingLevel = new Map<string, number>()
  const queue = characters.filter((c) => parentCount.get(c.id) === 0).map((c) => c.id)
  for (const id of queue) levelOf.set(id, 0)
  while (queue.length > 0) {
    const id = queue.shift() as string
    const level = levelOf.get(id) ?? 0
    const children = childByParent.get(id) ?? []
    for (const child of children) {
      pendingLevel.set(child, Math.max(pendingLevel.get(child) ?? 0, level + 1))
      const remainingParents = (parentCount.get(child) ?? 1) - 1
      parentCount.set(child, remainingParents)
      if (remainingParents === 0) {
        levelOf.set(child, pendingLevel.get(child) ?? 0)
        queue.push(child)
      }
    }
  }
  for (const c of characters) {
    if (!levelOf.has(c.id)) levelOf.set(c.id, 0)
  }
  const byLevel = new Map<number, string[]>()
  for (const c of characters) {
    const level = levelOf.get(c.id) ?? 0
    const list = byLevel.get(level) ?? []
    list.push(c.id)
    byLevel.set(level, list)
  }
  const xOf = new Map<string, number>()
  for (const [level, ids] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    if (level === 0) {
      ids.forEach((id, index) => xOf.set(id, index * familyNodeStep))
      continue
    }
    const ordered = ids
      .map((id, index) => {
        const parentXs = (parentIdsByChild.get(id) ?? [])
          .map((parentId) => xOf.get(parentId))
          .filter((x): x is number => x !== undefined)
        const desired = parentXs.length > 0
          ? parentXs.reduce((sum, x) => sum + x, 0) / parentXs.length
          : index * familyNodeStep
        return { id, index, desired }
      })
      .sort((a, b) => a.desired - b.desired || a.index - b.index)
    let cursor = Number.NEGATIVE_INFINITY
    for (let index = 0; index < ordered.length;) {
      let end = index + 1
      while (end < ordered.length && ordered[end].desired === ordered[index].desired) end += 1
      const groupSize = end - index
      const groupStart = Math.max(
        ordered[index].desired - ((groupSize - 1) * familyNodeStep) / 2,
        cursor,
      )
      for (let groupIndex = index; groupIndex < end; groupIndex += 1) {
        xOf.set(ordered[groupIndex].id, groupStart + (groupIndex - index) * familyNodeStep)
      }
      cursor = groupStart + groupSize * familyNodeStep
      index = end
    }
  }
  const minX = Math.min(...xOf.values(), 0)
  return [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([level, ids]) => {
      return ids.map((id, index) => ({
        id,
        position: {
          x: (xOf.get(id) ?? index * familyNodeStep) - minX,
          y: level * familyLevelStep,
        },
      }))
    })
}

function circleLayout(ids: string[]): DiagramLayoutNode[] {
  const count = ids.length
  const radius = Math.max(320, count * 90)
  const cx = count * 60
  const cy = count * 60
  return ids.map((id, i) => {
    const angle = (i / Math.max(count, 1)) * 2 * Math.PI
    return {
      id,
      position: {
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
      },
    }
  })
}

export const diagramService = {
  async listByProject(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.diagram.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })
  },

  async get(id: string, userId: string) {
    return prisma.diagram.findFirst({ where: { id, project: { userId } } })
  },

  async create(projectId: string, userId: string, data: DiagramInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const type: DiagramType = DIAGRAM_TYPES.includes(data.type as DiagramType)
      ? (data.type as DiagramType)
      : 'custom'
    return prisma.diagram.create({
      data: {
        projectId,
        name: data.name ?? (type === 'custom' ? 'Diagrama' : type),
        type,
        layout: {
          nodes: data.layout?.nodes ?? [],
          notes: data.layout?.notes ?? [],
        } as unknown as Prisma.InputJsonValue,
      },
    })
  },

  async update(id: string, userId: string, data: DiagramInput) {
    const diagram = await prisma.diagram.findFirst({ where: { id, project: { userId } } })
    if (!diagram) return null
    const current = (diagram.layout as unknown as DiagramLayout) ?? emptyLayout()
    return prisma.diagram.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type ? (DIAGRAM_TYPES.includes(data.type) ? data.type : diagram.type) : undefined,
        layout: data.layout
          ? ({
              nodes: data.layout.nodes ?? current.nodes,
              notes: data.layout.notes ?? current.notes,
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    })
  },

  async remove(id: string, userId: string) {
    const diagram = await prisma.diagram.findFirst({ where: { id, project: { userId } } })
    if (!diagram) return false
    await prisma.diagram.delete({ where: { id } })
    return true
  },

  async generate(projectId: string, userId: string, type: DiagramType, name?: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const characters = await prisma.character.findMany({
      where: { projectId },
      select: { id: true, name: true, imageUrl: true, parentIds: true },
      orderBy: { name: 'asc' },
    })
    const nodes: DiagramLayoutNode[] =
      type === 'familyTree'
        ? layeredFamilyLayout(characters)
        : circleLayout(characters.map((c) => c.id))
    return prisma.diagram.create({
      data: {
        projectId,
        name: name ?? (type === 'familyTree' ? 'Árbol genealógico' : 'Mapa de relaciones'),
        type,
        layout: { nodes, notes: [] } as unknown as Prisma.InputJsonValue,
      },
    })
  },

  async generateFamilyTree(projectId: string, userId: string) {
    return diagramService.generate(projectId, userId, 'familyTree')
  },

  async generateRelationships(projectId: string, userId: string) {
    return diagramService.generate(projectId, userId, 'relationships')
  },
}
