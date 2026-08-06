import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'

export interface BranchNode {
  id: string
  name: string
  documentId: string
  sourceVersionId: string | null
  userId: string
  createdAt: Date
  isMain: boolean
}

export interface GraphNode {
  id: string
  version: number
  branchId: string
  branchName: string
  title: string
  createdAt: Date
  parentIds: string[]
}

export interface GraphEdge {
  from: string
  to: string
}

export interface BranchGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  branches: { id: string; name: string; color: string }[]
}

const BRANCH_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
]

export const branchService = {
  async ensureMainBranch(documentId: string, userId: string) {
    const existing = await prisma.branch.findFirst({
      where: { documentId, name: 'main' },
    })
    if (existing) return existing

    return prisma.branch.create({
      data: {
        documentId,
        name: 'main',
        userId,
      },
    })
  },

  async list(documentId: string, userId: string): Promise<BranchNode[]> {
    const branches = await prisma.branch.findMany({
      where: { documentId, userId },
      orderBy: [{ name: 'asc' }],
    })

    return branches.map((b) => ({
      ...b,
      isMain: b.name === 'main',
    }))
  },

  async create(
    documentId: string,
    userId: string,
    name: string,
    sourceVersionId?: string,
  ): Promise<BranchNode | null> {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
    })
    if (!doc) return null

    const existing = await prisma.branch.findFirst({
      where: { documentId, name },
    })
    if (existing) return null

    if (sourceVersionId) {
      const version = await prisma.documentVersion.findFirst({
        where: { id: sourceVersionId, documentId },
      })
      if (!version) return null
    }

    const branch = await prisma.branch.create({
      data: {
        documentId,
        name,
        sourceVersionId: sourceVersionId ?? null,
        userId,
      },
    })

    return { ...branch, isMain: false }
  },

  async get(branchId: string, userId: string): Promise<BranchNode | null> {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, userId },
    })
    if (!branch) return null
    return { ...branch, isMain: branch.name === 'main' }
  },

  async rename(branchId: string, userId: string, name: string): Promise<BranchNode | null> {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, userId },
    })
    if (!branch || branch.name === 'main') return null

    const conflict = await prisma.branch.findFirst({
      where: { documentId: branch.documentId, name, id: { not: branchId } },
    })
    if (conflict) return null

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: { name },
    })

    return { ...updated, isMain: false }
  },

  async delete(branchId: string, userId: string): Promise<boolean> {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, userId },
    })
    if (!branch || branch.name === 'main') return false

    await prisma.branch.delete({ where: { id: branchId } })
    return true
  },

  async getGraph(documentId: string, userId: string): Promise<BranchGraphData> {
    const branches = await prisma.branch.findMany({
      where: { documentId, userId },
      orderBy: [{ name: 'asc' }],
    })

    const versions = await prisma.documentVersion.findMany({
      where: { documentId, branchId: { not: null } },
      include: {
        parents: { select: { parentId: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    })

    const branchColorMap = new Map<string, string>()
    branches.forEach((b, i) => {
      branchColorMap.set(b.id, BRANCH_COLORS[i % BRANCH_COLORS.length])
    })

    const branchNameMap = new Map<string, string>()
    for (const b of branches) {
      branchNameMap.set(b.id, b.name)
    }

    const nodes: GraphNode[] = versions.map((v) => ({
      id: v.id,
      version: v.version,
      branchId: v.branchId!,
      branchName: branchNameMap.get(v.branchId!) ?? 'unknown',
      title: v.title,
      createdAt: v.createdAt,
      parentIds: v.parents.map((p) => p.parentId),
    }))

    const edges: GraphEdge[] = []
    for (const node of nodes) {
      for (const parentId of node.parentIds) {
        edges.push({ from: parentId, to: node.id })
      }
    }

    const branchData = branches.map((b) => ({
      id: b.id,
      name: b.name,
      color: branchColorMap.get(b.id) ?? '#6b7280',
    }))

    return { nodes, edges, branches: branchData }
  },
}
