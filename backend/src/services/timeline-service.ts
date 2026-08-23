import { prisma } from '../lib/prisma.js'

export interface TimelineEventInput {
  title?: string
  date?: string | null
  description?: string | null
  order?: number
  eraId?: string | null
  characterIds?: string[]
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

async function sanitizeCharacterIds(projectId: string, characterIds: string[] | undefined) {
  if (!characterIds || characterIds.length === 0) return []
  const characters = await prisma.character.findMany({
    where: { projectId, id: { in: characterIds } },
    select: { id: true },
  })
  const valid = new Set(characters.map((c) => c.id))
  return [...new Set(characterIds.filter((id) => valid.has(id)))]
}

async function sanitizeEraId(projectId: string, eraId: string | null | undefined): Promise<string | null | undefined> {
  if (eraId === undefined) return undefined
  if (eraId === null) return null
  const era = await prisma.timelineEra.findFirst({ where: { id: eraId, projectId } })
  return era ? era.id : null
}

export interface TimelineEraInput {
  name: string
  color?: string | null
  precision?: string | null
  startDate?: string | null
  endDate?: string | null
  rollover?: string | null
}

export const timelineService = {
  async listEras(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.timelineEra.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async createEra(projectId: string, userId: string, data: TimelineEraInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const order = await prisma.timelineEra.count({ where: { projectId } })
    return prisma.timelineEra.create({
      data: {
        projectId,
        name: data.name,
        color: data.color ?? null,
        precision: data.precision ?? 'year',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        rollover: data.rollover ?? 'newYear',
        order,
      },
    })
  },

  async updateEra(id: string, userId: string, name: string) {
    const era = await prisma.timelineEra.findFirst({ where: { id, project: { userId } } })
    if (!era) return null
    return prisma.timelineEra.update({ where: { id }, data: { name } })
  },

  async removeEra(id: string, userId: string) {
    const era = await prisma.timelineEra.findFirst({ where: { id, project: { userId } } })
    if (!era) return false
    await prisma.timelineEvent.updateMany({ where: { eraId: id }, data: { eraId: null } })
    await prisma.timelineEra.delete({ where: { id } })
    return true
  },

  async listByProject(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.timelineEvent.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async get(id: string, userId: string) {
    return prisma.timelineEvent.findFirst({
      where: { id, project: { userId } },
    })
  },

  async create(projectId: string, userId: string, data: TimelineEventInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const characterIds = await sanitizeCharacterIds(projectId, data.characterIds)
    const eraId = await sanitizeEraId(projectId, data.eraId)
    const order = data.order ?? (await prisma.timelineEvent.count({ where: { projectId } }))
    return prisma.timelineEvent.create({
      data: {
        projectId,
        title: data.title ?? 'Evento',
        date: data.date ?? null,
        description: data.description ?? null,
        order,
        eraId: eraId ?? null,
        characterIds,
      },
    })
  },

  async update(id: string, userId: string, data: TimelineEventInput) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id, project: { userId } },
    })
    if (!event) return null
    const characterIds = data.characterIds !== undefined
      ? await sanitizeCharacterIds(event.projectId, data.characterIds)
      : undefined
    const eraId = await sanitizeEraId(event.projectId, data.eraId)
    return prisma.timelineEvent.update({
      where: { id },
      data: {
        title: data.title,
        date: data.date,
        description: data.description,
        order: data.order,
        eraId,
        characterIds,
      },
    })
  },

  async remove(id: string, userId: string) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id, project: { userId } },
    })
    if (!event) return false
    await prisma.timelineEvent.delete({ where: { id } })
    return true
  },
}
