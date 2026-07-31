import { prisma } from '../lib/prisma.js'

export interface CreateNoteInput {
  title: string
  content?: string
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  isHidden?: boolean
}

export const noteService = {
  async listByDocument(documentId: string, userId: string) {
    return prisma.note.findMany({
      where: { documentId, userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async listByProject(projectId: string, userId: string) {
    return prisma.note.findMany({
      where: { projectId, userId, documentId: null },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createForDocument(documentId: string, userId: string, data: CreateNoteInput) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) return null

    return prisma.note.create({
      data: {
        title: data.title,
        content: data.content ?? '',
        documentId,
        projectId: doc.projectId,
        userId,
      },
    })
  },

  async createForProject(projectId: string, userId: string, data: CreateNoteInput) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
    if (!project) return null

    return prisma.note.create({
      data: {
        title: data.title,
        content: data.content ?? '',
        projectId,
        userId,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateNoteInput) {
    const note = await prisma.note.findFirst({ where: { id, userId } })
    if (!note) return null

    return prisma.note.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        isHidden: data.isHidden,
      },
    })
  },

  async delete(id: string, userId: string) {
    const note = await prisma.note.findFirst({ where: { id, userId } })
    if (!note) return false

    await prisma.note.delete({ where: { id } })
    return true
  },
}
