import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'
import { branchService } from './branch-service.js'

export interface MergeConflict {
  index: number
  kind: 'modified' | 'added'
  base: Prisma.JsonValue | null
  ours: Prisma.JsonValue | null
  theirs: Prisma.JsonValue | null
}

export interface MergeResult {
  merged: boolean
  version?: Prisma.DocumentVersionGetPayload<Record<string, never>> | null
  conflicts?: MergeConflict[]
  mergedContent?: { type: string; content: (Prisma.JsonValue | null)[] }
}

type TipTapNode = Prisma.JsonObject | null

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function asNode(value: Prisma.JsonValue | undefined | null): TipTapNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as TipTapNode
}

function asNodes(doc: Prisma.JsonValue | undefined): TipTapNode[] {
  const parsed = asNode(doc)
  if (!parsed) return []
  const content = parsed.content
  if (!Array.isArray(content)) return []
  return content.map((n) => asNode(n))
}

function wrapperDoc(nodes: TipTapNode[]): Prisma.JsonValue {
  return { type: 'doc', content: nodes.filter((n) => n !== null) }
}

function diffContents(
  base: TipTapNode[],
  ours: TipTapNode[],
  theirs: TipTapNode[],
): { conflicts: MergeConflict[]; mergedNodes: (Prisma.JsonValue | null)[] } {
  const conflicts: MergeConflict[] = []
  const mergedNodes: (Prisma.JsonValue | null)[] = []

  for (let i = 0; i < base.length; i++) {
    const baseNode = base[i]
    const oursNode = ours[i] !== undefined ? ours[i] : null
    const theirsNode = theirs[i] !== undefined ? theirs[i] : null

    const oursChanged = !deepEqual(oursNode, baseNode)
    const theirsChanged = !deepEqual(theirsNode, baseNode)

    if (oursChanged && theirsChanged && !deepEqual(oursNode, theirsNode)) {
      conflicts.push({
        index: i,
        kind: 'modified',
        base: baseNode,
        ours: oursNode,
        theirs: theirsNode,
      })
      mergedNodes.push(baseNode)
    } else if (oursChanged) {
      mergedNodes.push(oursNode)
    } else if (theirsChanged) {
      mergedNodes.push(theirsNode)
    } else {
      mergedNodes.push(baseNode)
    }
  }

  const oursExtra = ours.slice(base.length).filter((n) => n !== null)
  const theirsExtra = theirs.slice(base.length).filter((n) => n !== null)

  if (deepEqual(oursExtra, theirsExtra)) {
    for (const node of oursExtra) mergedNodes.push(node)
  } else if (oursExtra.length > 0 && theirsExtra.length === 0) {
    for (const node of oursExtra) mergedNodes.push(node)
  } else if (theirsExtra.length > 0 && oursExtra.length === 0) {
    for (const node of theirsExtra) mergedNodes.push(node)
  } else if (oursExtra.length > 0 && theirsExtra.length > 0) {
    conflicts.push({
      index: base.length,
      kind: 'added',
      base: null,
      ours: wrapperDoc(oursExtra),
      theirs: wrapperDoc(theirsExtra),
    })
    mergedNodes.push(null)
  }

  return { conflicts, mergedNodes }
}

export const mergeService = {
  async merge(
    sourceBranchId: string,
    targetBranchId: string,
    userId: string,
    resolution?: { content?: Prisma.JsonValue },
  ): Promise<MergeResult | null> {
    const source = await branchService.get(sourceBranchId, userId)
    if (!source) return null
    const target = await branchService.get(targetBranchId, userId)
    if (!target) return null
    if (source.id === target.id) return null

    const document = await prisma.document.findFirst({ where: { id: target.documentId, userId } })
    if (!document) return null

    const baseVersion = source.sourceVersionId
      ? await prisma.documentVersion.findFirst({ where: { id: source.sourceVersionId, userId } })
      : await prisma.documentVersion.findFirst({
          where: { documentId: target.documentId, userId },
          orderBy: { createdAt: 'asc' },
        })

    const targetHead = await prisma.documentVersion.findFirst({
      where: { branchId: target.id },
      orderBy: { version: 'desc' },
    })
    const sourceHead = await prisma.documentVersion.findFirst({
      where: { branchId: source.id },
      orderBy: { version: 'desc' },
    })

    const targetHeadVersion = targetHead ?? (target.sourceVersionId
      ? await prisma.documentVersion.findFirst({ where: { id: target.sourceVersionId, userId } })
      : null)
    const sourceHeadVersion = sourceHead ?? (source.sourceVersionId
      ? await prisma.documentVersion.findFirst({ where: { id: source.sourceVersionId, userId } })
      : null)

    const baseNodes = asNodes(baseVersion?.content)
    const oursNodes = asNodes(targetHeadVersion?.content)
    const theirsNodes = asNodes(sourceHeadVersion?.content)

    const { conflicts, mergedNodes } = diffContents(baseNodes, oursNodes, theirsNodes)

    if (conflicts.length > 0 && !resolution?.content) {
      return {
        merged: false,
        conflicts,
        mergedContent: { type: 'doc', content: mergedNodes },
      }
    }

    const content = resolution?.content ?? { type: 'doc', content: mergedNodes }

    const lastInTarget = await prisma.documentVersion.findFirst({
      where: { branchId: target.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (lastInTarget?.version ?? 0) + 1

    const commit = await prisma.documentVersion.create({
      data: {
        documentId: target.documentId,
        branchId: target.id,
        userId,
        title: targetHeadVersion?.title ?? sourceHeadVersion?.title ?? document.title,
        content: content as Prisma.InputJsonValue,
        version,
      },
    })

    const parentIds = [targetHeadVersion?.id, sourceHeadVersion?.id].filter(
      (id): id is string => !!id && id !== commit.id,
    )
    if (parentIds.length > 0) {
      await prisma.versionParent.createMany({
        data: parentIds.map((parentId) => ({ versionId: commit.id, parentId })),
      })
    }

    return { merged: true, version: commit }
  },
}
