import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'
import { branchService } from './branch-service.js'

export interface CreateProjectInput {
  name: string
  description?: string
  storyMeta?: Prisma.InputJsonValue
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  storyMeta?: Prisma.InputJsonValue
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

  async getProjectPage(id: string, userId: string) {
    const [project, tree] = await Promise.all([
      this.getById(id, userId),
      documentService.getTree(id, userId),
    ])
    if (!project) return null
    return { ...project, tree }
  },

  async create(userId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        storyMeta: data.storyMeta ?? ({} as Prisma.InputJsonValue),
        userId,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateProjectInput) {
    const project = await prisma.project.findFirst({ where: { id, userId } })
    if (!project) return null

    return prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        storyMeta: data.storyMeta,
      },
    })
  },

  async updateStoryMeta(id: string, userId: string, storyMeta: Prisma.InputJsonValue) {
    const project = await prisma.project.findFirst({ where: { id, userId } })
    if (!project) return null

    return prisma.project.update({
      where: { id },
      data: { storyMeta },
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
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId },
      select: { id: true },
    })
    if (!project) return null

    if (data.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: data.folderId, projectId: project.id },
        select: { id: true },
      })
      if (!folder) return null
    }

    if (data.parentId) {
      const parent = await prisma.document.findFirst({
        where: { id: data.parentId, projectId: project.id, userId },
        select: { id: true },
      })
      if (!parent) return null
    }

    const document = await prisma.document.create({
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

    await branchService.ensureMainBranch(document.id, userId)

    return document
  },

  async update(id: string, userId: string, data: UpdateDocumentInput) {
    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return null

    if (data.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: data.folderId, projectId: doc.projectId },
        select: { id: true },
      })
      if (!folder) return null
    }

    if (data.parentId) {
      const parent = await prisma.document.findFirst({
        where: { id: data.parentId, projectId: doc.projectId, userId },
        select: { id: true },
      })
      if (!parent) return null
    }

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

  async duplicate(id: string, userId: string) {
    const original = await prisma.document.findFirst({
      where: { id, userId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        title: true,
        content: true,
        type: true,
        order: true,
        folderId: true,
      },
    })
    if (!original) return null

    const projectDocs = await prisma.document.findMany({
      where: { projectId: original.projectId, userId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        title: true,
        content: true,
        type: true,
        order: true,
        folderId: true,
      },
    })

    const docById = new Map(projectDocs.map((d) => [d.id, d]))
    const childrenMap = new Map<string, typeof projectDocs>()
    for (const d of projectDocs) {
      if (!d.parentId) continue
      const arr = childrenMap.get(d.parentId) ?? []
      arr.push(d)
      childrenMap.set(d.parentId, arr)
    }
    for (const arr of childrenMap.values()) {
      arr.sort((a, b) => a.order - b.order)
    }

    const subtree: typeof projectDocs = []
    const queue: string[] = [original.id]
    const visited = new Set<string>()
    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)
      const node = currentId === original.id ? original : docById.get(currentId)
      if (!node) continue
      subtree.push(node)
      for (const child of childrenMap.get(currentId) ?? []) {
        queue.push(child.id)
      }
    }

    const idMap = new Map<string, string>()
    let duplicatedRoot: { id: string } | null = null

    for (const node of subtree) {
      const newParentId = node.parentId ? (idMap.get(node.parentId) ?? null) : original.parentId
      const created = await prisma.document.create({
        data: {
          title: newParentId === null ? `${node.title} (Copia)` : node.title,
          content: node.content ?? Prisma.JsonNull,
          type: node.type,
          order: node.order + 1,
          userId,
          projectId: node.projectId,
          folderId: node.folderId,
          parentId: newParentId,
        },
      })
      idMap.set(node.id, created.id)
      if (node.id === original.id) duplicatedRoot = created
    }

    if (idMap.size > 0) {
      await prisma.branch.createMany({
        data: [...idMap.values()].map((newDocId) => ({ documentId: newDocId, name: 'main', userId })),
      })
    }

    return duplicatedRoot
  },
}

