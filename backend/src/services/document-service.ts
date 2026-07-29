import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
}

export interface CreateDocumentInput {
  title: string
  content?: Prisma.InputJsonValue
  type?: 'document' | 'chapter' | 'subpage'
  projectId: string
  folderId?: string
  parentId?: string
  order?: number
}

export interface UpdateDocumentInput {
  title?: string
  content?: Prisma.InputJsonValue
  folderId?: string | null
  parentId?: string | null
  order?: number
}

export const projectService = {
  async list(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { documents: true, folders: true } },
      },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: {
        folders: { orderBy: { name: 'asc' } },
        documents: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
        },
      },
    })
  },

  async create(userId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        userId,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateProjectInput) {
    const project = await prisma.project.findFirst({ where: { id, userId } })
    if (!project) return null

    return prisma.project.update({
      where: { id },
      data,
    })
  },

  async delete(id: string, userId: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } })
    if (!project) return false

    await prisma.project.delete({ where: { id } })
    return true
  },
}

export const documentService = {
  async listByProject(projectId: string, userId: string) {
    return prisma.document.findMany({
      where: { projectId, userId, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' },
          include: {
            children: { orderBy: { order: 'asc' } },
          },
        },
      },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.document.findFirst({
      where: { id, userId },
      include: {
        children: { orderBy: { order: 'asc' } },
        parent: { select: { id: true, title: true, type: true } },
      },
    })
  },

  async create(userId: string, data: CreateDocumentInput) {
    return prisma.document.create({
      data: {
        title: data.title,
        content: data.content ?? Prisma.JsonNull,
        type: data.type ?? 'document',
        order: data.order ?? 0,
        userId,
        projectId: data.projectId,
        folderId: data.folderId,
        parentId: data.parentId,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateDocumentInput) {
    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return null

    return prisma.document.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content ?? undefined,
        folderId: data.folderId,
        parentId: data.parentId,
        order: data.order,
      },
    })
  },

  async delete(id: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return false

    await prisma.document.delete({ where: { id } })
    return true
  },

  async getTree(projectId: string, userId: string) {
    return prisma.document.findMany({
      where: { projectId, userId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      select: {
        id: true,
        title: true,
        type: true,
        parentId: true,
        order: true,
        updatedAt: true,
      },
    })
  },
}
