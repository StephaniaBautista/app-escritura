import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'

export const MAX_VERSIONS_PER_DOCUMENT = 50

export const versionService = {
  async list(documentId: string, userId: string) {
    return prisma.documentVersion.findMany({
      where: { documentId, userId },
      orderBy: { version: 'desc' },
    })
  },

  async create(documentId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) return null

    const last = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    })
    const version = (last?.version ?? 0) + 1

    const created = await prisma.documentVersion.create({
      data: {
        documentId,
        userId,
        title: doc.title,
        content: doc.content as Prisma.InputJsonValue,
        version,
      },
    })

    await this.enforceLimit(documentId)
    return created
  },

  async get(id: string, userId: string) {
    return prisma.documentVersion.findFirst({ where: { id, userId } })
  },

  async restore(id: string, userId: string) {
    const version = await prisma.documentVersion.findFirst({ where: { id, userId } })
    if (!version) return null

    const doc = await prisma.document.findFirst({ where: { id: version.documentId, userId } })
    if (!doc) return null

    return prisma.document.update({
      where: { id: version.documentId },
      data: {
        title: version.title,
        content: version.content as Prisma.InputJsonValue,
      },
    })
  },

  async enforceLimit(documentId: string) {
    const count = await prisma.documentVersion.count({ where: { documentId } })
    if (count <= MAX_VERSIONS_PER_DOCUMENT) return

    const toKeep = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      take: MAX_VERSIONS_PER_DOCUMENT,
      select: { id: true },
    })

    await prisma.documentVersion.deleteMany({
      where: { documentId, id: { notIn: toKeep.map((v) => v.id) } },
    })
  },
}
