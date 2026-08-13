import { prisma } from '../lib/prisma.js'

export const RELATIONSHIP_TYPES = ['romance', 'friendship', 'enemity', 'family', 'custom'] as const
export type RelationshipType = typeof RELATIONSHIP_TYPES[number]

export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const
export type LineStyle = (typeof LINE_STYLES)[number]

const LINE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export class RelationshipExistsError extends Error {
  constructor() {
    super('RELATIONSHIP_EXISTS')
    this.name = 'RelationshipExistsError'
  }
}

export class RelationshipNotFoundError extends Error {
  constructor() {
    super('RELATIONSHIP_NOT_FOUND')
    this.name = 'RelationshipNotFoundError'
  }
}

export interface RelationshipInput {
  characterAId?: string
  characterBId?: string
  type?: string
  label?: string | null
  description?: string | null
  lineColor?: string | null
  lineStyle?: string | null
}

export function normalizeType(type: string | undefined): string {
  return RELATIONSHIP_TYPES.includes(type as RelationshipType) ? (type as string) : 'custom'
}

export function normalizeLineColor(color: string | null | undefined): string | null {
  return typeof color === 'string' && LINE_COLOR_PATTERN.test(color) ? color : null
}

export function normalizeLineStyle(style: string | null | undefined): LineStyle | null {
  return LINE_STYLES.includes(style as LineStyle) ? (style as LineStyle) : null
}

export function normalizePair(a: string, b: string): { characterAId: string; characterBId: string } {
  return a < b ? { characterAId: a, characterBId: b } : { characterAId: b, characterBId: a }
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

async function sanitizePair(projectId: string, a: string, b: string) {
  const characters = await prisma.character.findMany({
    where: { projectId, id: { in: [a, b] } },
    select: { id: true },
  })
  if (characters.length !== 2) return null
  return normalizePair(a, b)
}

export const relationshipService = {
  async listByProject(projectId: string, userId: string, type?: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.characterRelationship.findMany({
      where: { projectId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'asc' },
      include: {
        characterA: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
        characterB: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
      },
    })
  },

  async create(projectId: string, userId: string, data: RelationshipInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    if (!data.characterAId || !data.characterBId || data.characterAId === data.characterBId) {
      throw new RelationshipNotFoundError()
    }
    const pair = await sanitizePair(projectId, data.characterAId, data.characterBId)
    if (!pair) throw new RelationshipNotFoundError()
    const existing = await prisma.characterRelationship.findFirst({
      where: { projectId, characterAId: pair.characterAId, characterBId: pair.characterBId },
    })
    if (existing) throw new RelationshipExistsError()
    return prisma.characterRelationship.create({
      data: {
        projectId,
        ...pair,
        type: normalizeType(data.type),
        label: data.label ?? null,
        description: data.description ?? null,
        lineColor: normalizeLineColor(data.lineColor),
        lineStyle: normalizeLineStyle(data.lineStyle),
      },
      include: {
        characterA: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
        characterB: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
      },
    })
  },

  async update(id: string, userId: string, data: RelationshipInput) {
    const rel = await prisma.characterRelationship.findFirst({
      where: { id, project: { userId } },
    })
    if (!rel) throw new RelationshipNotFoundError()
    let pair: { characterAId: string; characterBId: string } | null = null
    if (data.characterAId && data.characterBId) {
      if (data.characterAId === data.characterBId) throw new RelationshipNotFoundError()
      pair = await sanitizePair(rel.projectId, data.characterAId, data.characterBId)
      if (!pair) throw new RelationshipNotFoundError()
      if (pair.characterAId !== rel.characterAId || pair.characterBId !== rel.characterBId) {
        const existing = await prisma.characterRelationship.findFirst({
          where: {
            projectId: rel.projectId,
            characterAId: pair.characterAId,
            characterBId: pair.characterBId,
          },
        })
        if (existing) throw new RelationshipExistsError()
      }
    }
    return prisma.characterRelationship.update({
      where: { id },
      data: {
        ...(pair ?? {}),
        type: data.type !== undefined ? normalizeType(data.type) : undefined,
        label: data.label,
        description: data.description,
        lineColor: data.lineColor !== undefined ? normalizeLineColor(data.lineColor) : undefined,
        lineStyle: data.lineStyle !== undefined ? normalizeLineStyle(data.lineStyle) : undefined,
      },
      include: {
        characterA: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
        characterB: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
      },
    })
  },

  async remove(id: string, userId: string) {
    const rel = await prisma.characterRelationship.findFirst({
      where: { id, project: { userId } },
    })
    if (!rel) throw new RelationshipNotFoundError()
    await prisma.characterRelationship.delete({ where: { id } })
    return true
  },
}
