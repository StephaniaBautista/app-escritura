import { prisma } from '../lib/prisma.js'

export const TAG_KINDS = ['rating', 'warning', 'category', 'fandom', 'relationship', 'character', 'freeform'] as const
export type TagKind = typeof TAG_KINDS[number]

export function isTagKind(value: unknown): value is TagKind {
  return typeof value === 'string' && (TAG_KINDS as readonly string[]).includes(value)
}

function normalizeKind(value: unknown): TagKind {
  return isTagKind(value) ? value : 'freeform'
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function storyMetaStrings(meta: unknown, key: string): string[] {
  if (typeof meta !== 'object' || meta === null) return []
  const value = (meta as Record<string, unknown>)[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
}

function storyMetaRating(meta: unknown): string | null {
  if (typeof meta !== 'object' || meta === null) return null
  const value = (meta as Record<string, unknown>).rating
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

interface SeedRow {
  name: string
  kind: TagKind
}

function seedsFromStoryMeta(meta: unknown): SeedRow[] {
  const rows: SeedRow[] = []
  const push = (names: string[], kind: TagKind) => {
    for (const name of names) {
      const trimmed = normalizeName(name)
      if (trimmed) rows.push({ name: trimmed, kind })
    }
  }
  push(storyMetaStrings(meta, 'tags'), 'freeform')
  push(storyMetaStrings(meta, 'fandoms'), 'fandom')
  push(storyMetaStrings(meta, 'ships'), 'relationship')
  push(storyMetaStrings(meta, 'categories'), 'category')
  const rating = storyMetaRating(meta)
  if (rating) rows.push({ name: rating, kind: 'rating' })
  return rows
}

export const tagsService = {
  async list(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true, storyMeta: true, tags: { select: { id: true }, take: 1 } },
    })
    if (!project) return null
    if (project.tags.length === 0) {
      await tagsService.seed(projectId, project.storyMeta)
    }
    return prisma.tag.findMany({
      where: { projectId },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })
  },

  async seed(projectId: string, meta: unknown) {
    const seeds = seedsFromStoryMeta(meta)
    if (seeds.length === 0) return
    const seen = new Set<string>()
    for (const seed of seeds) {
      const key = seed.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      await prisma.tag.upsert({
        where: { projectId_name: { projectId, name: seed.name } },
        update: { kind: seed.kind },
        create: { projectId, name: seed.name, kind: seed.kind },
      })
    }
  },

  async create(projectId: string, userId: string, data: { name: string; kind?: string }) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
    if (!project) return null
    const name = normalizeName(data.name ?? '')
    if (!name) return null
    const existing = await prisma.tag.findFirst({
      where: { projectId, name: { equals: name, mode: 'insensitive' } },
    })
    if (existing) {
      return prisma.tag.update({ where: { id: existing.id }, data: { name, kind: normalizeKind(data.kind) } })
    }
    return prisma.tag.create({ data: { projectId, name, kind: normalizeKind(data.kind) } })
  },

  async update(id: string, userId: string, data: { name?: string; kind?: string }) {
    const tag = await prisma.tag.findFirst({ where: { id, project: { userId } } })
    if (!tag) return null
    const name = data.name === undefined ? tag.name : normalizeName(data.name)
    if (!name) return null
    return prisma.tag.update({
      where: { id },
      data: { name, kind: data.kind === undefined ? tag.kind : normalizeKind(data.kind) },
    })
  },

  async remove(id: string, userId: string) {
    const tag = await prisma.tag.findFirst({ where: { id, project: { userId } }, select: { id: true } })
    if (!tag) return false
    await prisma.tag.delete({ where: { id } })
    return true
  },

  async listForUserProjects(userId: string) {
    return prisma.tag.findMany({
      where: { project: { userId } },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })
  },
}
