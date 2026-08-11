import { prisma } from '../lib/prisma.js'

export interface TimelineEventInput {
  title?: string
  date?: string | null
  description?: string | null
  order?: number
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

export const timelineService = {
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
    const order = data.order ?? (await prisma.timelineEvent.count({ where: { projectId } }))
    return prisma.timelineEvent.create({
      data: {
        projectId,
        title: data.title ?? 'Evento',
        date: data.date ?? null,
        description: data.description ?? null,
        order,
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
    return prisma.timelineEvent.update({
      where: { id },
      data: {
        title: data.title,
        date: data.date,
        description: data.description,
        order: data.order,
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
