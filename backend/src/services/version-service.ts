import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'
import { getMaxVersions, type Tier, Tier as TierEnum } from '../config/tiers.js'
import { branchService } from './branch-service.js'

export const versionService = {
  async list(documentId: string, userId: string, branchId?: string) {
    const where: { documentId: string; userId: string; branchId?: string } = { documentId, userId }
    if (branchId) where.branchId = branchId

    return prisma.documentVersion.findMany({
      where,
      orderBy: { version: 'desc' },
    })
  },

  async create(documentId: string, userId: string, tier: Tier = TierEnum.FREE, branchId?: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) return null

    const branch = branchId
      ? await branchService.get(branchId, userId)
      : await branchService.ensureMainBranch(documentId, userId)
    if (!branch) return null

    const maxVersions = getMaxVersions(tier)
    if (maxVersions !== null) {
      const count = await prisma.documentVersion.count({ where: { branchId: branch.id } })
      if (count >= maxVersions) {
        return null
      }
    }

    const last = await prisma.documentVersion.findFirst({
      where: { branchId: branch.id },
      orderBy: { version: 'desc' },
    })
    const version = (last?.version ?? 0) + 1

    const created = await prisma.documentVersion.create({
      data: {
        documentId,
        branchId: branch.id,
        userId,
        title: doc.title,
        content: doc.content as Prisma.InputJsonValue,
        version,
      },
    })

    if (maxVersions !== null) {
      await this.enforceLimit(branch.id, maxVersions)
    }
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

  async enforceLimit(branchId: string, limit: number) {
    const count = await prisma.documentVersion.count({ where: { branchId } })
    if (count <= limit) return

    const toKeep = await prisma.documentVersion.findMany({
      where: { branchId },
      orderBy: { version: 'desc' },
      take: limit,
      select: { id: true },
    })

    await prisma.documentVersion.deleteMany({
      where: { branchId, id: { notIn: toKeep.map((v) => v.id) } },
    })
  },
}