import { prisma } from '../lib/prisma.js'
import { parseEventDateValue } from '../lib/timeline-event-date.js'
import { allowTimelineCharacterIds } from '../lib/timeline-evolution-gate.js'
import { resolveSubplotId } from '../lib/subplot-link.js'
import { storageService } from './storage-service.js'

export interface TimelineEventInput {
  title?: string
  date?: string | null
  description?: string | null
  order?: number
  eraId?: string | null
  characterIds?: string[]
  icon?: string | null
  color?: string | null
  groupName?: string | null
  precision?: string | null
  endDate?: string | null
  label?: string | null
  labelColor?: string | null
  imageUrl?: string | null
  relatedEventIds?: string[]
  relatedDocumentIds?: string[]
  subplotId?: string | null
}

export interface TimelineEraInput {
  name?: string
  color?: string | null
  precision?: string | null
  startDate?: string | null
  endDate?: string | null
  rollover?: string | null
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

async function sanitizeCharacterIds(
  projectId: string,
  characterIds: string[] | undefined,
  context: { date?: string | null; excludeEventId?: string } = {},
) {
  if (!characterIds || characterIds.length === 0) return []
  const selected = await prisma.character.findMany({
    where: { projectId, id: { in: characterIds } },
    select: { id: true, evolvesFromId: true },
  })
  const valid = new Set(selected.map((c) => c.id))
  const unique = [...new Set(characterIds.filter((id) => valid.has(id)))]
  if (!selected.some((c) => c.evolvesFromId)) return unique

  const [allCharacters, events] = await Promise.all([
    prisma.character.findMany({
      where: { projectId },
      select: { id: true, evolvesFromId: true },
    }),
    prisma.timelineEvent.findMany({
      where: { projectId },
      select: { id: true, date: true, characterIds: true },
    }),
  ])
  return allowTimelineCharacterIds(
    unique,
    allCharacters,
    events,
    context.excludeEventId ?? null,
    parseEventDateValue(context.date ?? null),
    parseEventDateValue,
  )
}

async function sanitizeRelatedEventIds(projectId: string, ids: string[] | undefined, selfId?: string) {
  if (!ids || ids.length === 0) return []
  const candidates = ids.filter((id) => id !== selfId)
  if (candidates.length === 0) return []
  const events = await prisma.timelineEvent.findMany({
    where: { projectId, id: { in: candidates } },
    select: { id: true },
  })
  const valid = new Set(events.map((e) => e.id))
  return [...new Set(candidates.filter((id) => valid.has(id)))]
}

async function sanitizeRelatedDocumentIds(projectId: string, ids: string[] | undefined) {
  if (!ids || ids.length === 0) return []
  const documents = await prisma.document.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true },
  })
  const valid = new Set(documents.map((d) => d.id))
  return [...new Set(ids.filter((id) => valid.has(id)))]
}

async function sanitizeEraId(projectId: string, eraId: string | null | undefined): Promise<string | null | undefined> {
  if (eraId === undefined) return undefined
  if (eraId === null) return null
  const era = await prisma.timelineEra.findFirst({ where: { id: eraId, projectId } })
  return era ? era.id : null
}

function eraData(data: TimelineEraInput) {
  return {
    name: data.name,
    color: data.color,
    precision: data.precision ?? undefined,
    startDate: data.startDate,
    endDate: data.endDate,
    rollover: data.rollover ?? undefined,
  }
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

  async createEra(projectId: string, userId: string, data: TimelineEraInput & { name: string }) {
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

  async updateEra(id: string, userId: string, data: TimelineEraInput) {
    const era = await prisma.timelineEra.findFirst({ where: { id, project: { userId } } })
    if (!era) return null
    return prisma.timelineEra.update({ where: { id }, data: eraData(data) })
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
    const characterIds = await sanitizeCharacterIds(projectId, data.characterIds, { date: data.date })
    const relatedEventIds = await sanitizeRelatedEventIds(projectId, data.relatedEventIds)
    const relatedDocumentIds = await sanitizeRelatedDocumentIds(projectId, data.relatedDocumentIds)
    const eraId = await sanitizeEraId(projectId, data.eraId)
    const subplotId = await resolveSubplotId(projectId, data.subplotId)
    const order = data.order ?? (await prisma.timelineEvent.count({ where: { projectId } }))
    return prisma.timelineEvent.create({
      data: {
        projectId,
        title: data.title ?? 'Evento',
        date: data.date ?? null,
        description: data.description ?? null,
        order,
        eraId: eraId ?? null,
        subplotId: subplotId ?? null,
        characterIds,
        icon: data.icon ?? null,
        color: data.color ?? null,
        groupName: data.groupName ?? null,
        precision: data.precision ?? 'year',
        endDate: data.endDate ?? null,
        label: data.label ?? null,
        labelColor: data.labelColor ?? null,
        relatedEventIds,
        relatedDocumentIds,
      },
    })
  },

  async update(id: string, userId: string, data: TimelineEventInput) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id, project: { userId } },
    })
    if (!event) return null
    const characterIds = data.characterIds !== undefined || data.date !== undefined
      ? await sanitizeCharacterIds(
        event.projectId,
        data.characterIds ?? event.characterIds,
        { date: data.date !== undefined ? data.date : event.date, excludeEventId: id },
      )
      : undefined
    const relatedEventIds = data.relatedEventIds !== undefined
      ? await sanitizeRelatedEventIds(event.projectId, data.relatedEventIds, id)
      : undefined
    const relatedDocumentIds = data.relatedDocumentIds !== undefined
      ? await sanitizeRelatedDocumentIds(event.projectId, data.relatedDocumentIds)
      : undefined
    const eraId = await sanitizeEraId(event.projectId, data.eraId)
    const subplotId = await resolveSubplotId(event.projectId, data.subplotId)
    const updated = await prisma.timelineEvent.update({
      where: { id },
      data: {
        title: data.title,
        date: data.date,
        description: data.description,
        order: data.order,
        eraId,
        subplotId,
        characterIds,
        icon: data.icon,
        color: data.color,
        groupName: data.groupName,
        precision: data.precision ?? undefined,
        endDate: data.endDate,
        label: data.label,
        labelColor: data.labelColor,
        imageUrl: data.imageUrl,
        relatedEventIds,
        relatedDocumentIds,
      },
    })
    if (data.imageUrl !== undefined && event.imageUrl && event.imageUrl !== data.imageUrl) {
      await storageService.deleteCharacterImage(event.imageUrl).catch(() => undefined)
    }
    return updated
  },

  async remove(id: string, userId: string) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id, project: { userId } },
    })
    if (!event) return false
    await prisma.timelineEvent.delete({ where: { id } })
    if (event.imageUrl) await storageService.deleteCharacterImage(event.imageUrl).catch(() => undefined)
    return true
  },
}
