import { prisma } from '../lib/prisma.js'

export const SUBPLOT_STATUSES = ['active', 'resolved', 'dropped'] as const
export type SubplotStatus = typeof SUBPLOT_STATUSES[number]

export interface SubplotInput {
  title?: string
  description?: string | null
  status?: string
  color?: string | null
  order?: number
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

function normalizeStatus(status: string | undefined): SubplotStatus {
  return SUBPLOT_STATUSES.includes(status as SubplotStatus) ? status as SubplotStatus : 'active'
}

export const subplotService = {
  async list(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.subplot.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async create(projectId: string, userId: string, data: SubplotInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const order = data.order ?? (await prisma.subplot.count({ where: { projectId } }))
    return prisma.subplot.create({
      data: {
        projectId,
        title: data.title ?? '',
        description: data.description ?? null,
        status: normalizeStatus(data.status),
        color: data.color ?? null,
        order,
      },
    })
  },

  async update(id: string, userId: string, data: SubplotInput) {
    const subplot = await prisma.subplot.findFirst({ where: { id, project: { userId } } })
    if (!subplot) return null
    return prisma.subplot.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status === undefined ? undefined : normalizeStatus(data.status),
        color: data.color,
        order: data.order,
      },
    })
  },

  async remove(id: string, userId: string) {
    const subplot = await prisma.subplot.findFirst({ where: { id, project: { userId } } })
    if (!subplot) return false
    await prisma.subplot.delete({ where: { id } })
    return true
  },

  async reorder(projectId: string, userId: string, subplotIds: string[]) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const subplots = await prisma.subplot.findMany({ where: { projectId } })
    const validIds = new Set(subplots.map((subplot) => subplot.id))
    const updates = subplotIds
      .filter((subplotId) => validIds.has(subplotId))
      .map((subplotId, index) =>
        prisma.subplot.update({ where: { id: subplotId }, data: { order: index } }),
      )
    await prisma.$transaction(updates)
    return prisma.subplot.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },
}
