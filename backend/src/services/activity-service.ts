import { prisma } from '../lib/prisma.js'

export type ActivityType = 'folder_created' | 'document_created' | 'document_edited'

export interface CreateActivityInput {
  type: ActivityType
  title: string
  folderId?: string
  documentId?: string
}

const MAX_ACTIVITIES = 20

export const activityService = {
  async list(userId: string) {
    return prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ACTIVITIES,
    })
  },

  async create(userId: string, data: CreateActivityInput) {
    return prisma.activity.create({
      data: {
        type: data.type,
        title: data.title,
        folderId: data.folderId ?? null,
        documentId: data.documentId ?? null,
        userId,
      },
    })
  },

  async removeByDocument(documentId: string, userId: string) {
    await prisma.activity.deleteMany({ where: { documentId, userId } })
  },

  async removeByFolder(folderId: string, userId: string) {
    await prisma.activity.deleteMany({ where: { folderId, userId } })
  },
}
