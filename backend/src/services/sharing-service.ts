import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { blocksOutline, quoteHead, resolveAnchor, type BlockOutline } from '../lib/comment-anchor.js'

export const COMMENT_MAX_LEN = 2000
export const AUTHOR_MAX_LEN = 40
export const QUOTE_MAX_LEN = 200

export class SharingError extends Error {
  constructor(message: string, readonly code: string, readonly statusCode: number) {
    super(message)
  }
}

function newToken(): string {
  return randomBytes(32).toString('base64url')
}

function sanitizeBody(value: string): string {
  return value.trim().slice(0, COMMENT_MAX_LEN)
}

function sanitizeAuthor(value: string | undefined): string {
  const name = (value ?? '').trim().slice(0, AUTHOR_MAX_LEN)
  return name || 'Anónimo'
}

export interface SharedCommentPayload {
  id: string
  blockIndex: number
  quote: string
  body: string
  authorName: string
  resolved: boolean
  createdAt: string
  orphan: boolean
  effectiveBlockIndex: number | null
}

export interface SharedDocumentPayload {
  token: string
  title: string
  blocks: BlockOutline[]
  ownerName: string
  includeChildren: boolean
  allowComments: boolean
  children: { title: string; blocks: BlockOutline[] }[]
  comments: SharedCommentPayload[]
}

async function activeLink(token: string) {
  return prisma.sharedLink.findFirst({
    where: { token, revokedAt: null },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          content: true,
          userId: true,
          children: {
            select: { id: true, title: true, content: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })
}

async function ownedLink(documentId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  })
  return document ? true : false
}

export const sharingService = {
  async createLink(documentId: string, userId: string, options: { includeChildren?: boolean; allowComments?: boolean }) {
    if (!(await ownedLink(documentId, userId))) return null
    await prisma.sharedLink.deleteMany({ where: { documentId, revokedAt: null } })
    return prisma.sharedLink.create({
      data: {
        token: newToken(),
        documentId,
        createdById: userId,
        includeChildren: options.includeChildren === true,
        allowComments: options.allowComments !== false,
      },
    })
  },

  async getLink(documentId: string, userId: string) {
    if (!(await ownedLink(documentId, userId))) return null
    return prisma.sharedLink.findFirst({
      where: { documentId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  },

  async revokeLink(documentId: string, userId: string) {
    if (!(await ownedLink(documentId, userId))) return false
    await prisma.sharedLink.updateMany({
      where: { documentId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return true
  },

  async listComments(token: string): Promise<SharedCommentPayload[]> {
    const link = await prisma.sharedLink.findFirst({
      where: { token, revokedAt: null },
      select: { id: true, document: { select: { content: true } } },
    })
    if (!link) {
      throw new SharingError('Enlace no encontrado', 'SHARED_NOT_FOUND', 404)
    }
    const comments = await prisma.sharedComment.findMany({
      where: { sharedLinkId: link.id },
      orderBy: { createdAt: 'asc' },
    })
    return comments.map((comment) => {
      const anchor = resolveAnchor(link.document.content, comment.blockIndex, comment.quote)
      return {
        id: comment.id,
        blockIndex: comment.blockIndex,
        quote: comment.quote,
        body: comment.body,
        authorName: comment.authorName,
        resolved: comment.resolvedAt !== null,
        createdAt: comment.createdAt.toISOString(),
        orphan: anchor.orphan,
        effectiveBlockIndex: anchor.blockIndex,
      }
    })
  },

  async readShared(token: string): Promise<SharedDocumentPayload> {
    const link = await activeLink(token)
    if (!link) {
      throw new SharingError('Enlace no encontrado', 'SHARED_NOT_FOUND', 404)
    }
    return {
      token,
      title: link.document.title,
      blocks: blocksOutline(link.document.content),
      ownerName: link.createdBy.name ?? 'Anónimo',
      includeChildren: link.includeChildren,
      allowComments: link.allowComments,
      children: link.includeChildren
        ? link.document.children.map((child) => ({ title: child.title, blocks: blocksOutline(child.content) }))
        : [],
      comments: await sharingService.listComments(token),
    }
  },

  async addComment(
    token: string,
    input: { blockIndex: number; quote?: string; body: string; authorName?: string },
    userId: string | null,
  ): Promise<SharedCommentPayload> {
    const link = await activeLink(token)
    if (!link) {
      throw new SharingError('Enlace no encontrado', 'SHARED_NOT_FOUND', 404)
    }
    if (!link.allowComments) {
      throw new SharingError('Comentarios desactivados', 'COMMENTS_DISABLED', 403)
    }
    const body = sanitizeBody(input.body ?? '')
    if (!body) {
      throw new SharingError('Comentario vacío', 'COMMENT_EMPTY', 400)
    }
    const quote = quoteHead(input.quote ?? '', QUOTE_MAX_LEN)
    const anchor = resolveAnchor(link.document.content, input.blockIndex, quote)
    const created = await prisma.sharedComment.create({
      data: {
        sharedLinkId: link.id,
        blockIndex: anchor.blockIndex ?? input.blockIndex,
        quote,
        body,
        authorName: sanitizeAuthor(input.authorName),
        userId,
      },
    })
    return {
      id: created.id,
      blockIndex: created.blockIndex,
      quote: created.quote,
      body: created.body,
      authorName: created.authorName,
      resolved: false,
      createdAt: created.createdAt.toISOString(),
      orphan: anchor.orphan,
      effectiveBlockIndex: anchor.blockIndex,
    }
  },

  async resolveComment(token: string, commentId: string, userId: string, resolved: boolean) {
    const link = await prisma.sharedLink.findFirst({
      where: { token, revokedAt: null },
      select: { id: true, document: { select: { userId: true } } },
    })
    if (!link || link.document.userId !== userId) return null
    return prisma.sharedComment.update({
      where: { id: commentId },
      data: { resolvedAt: resolved ? new Date() : null },
    })
  },

  async deleteComment(token: string, commentId: string, userId: string) {
    const link = await prisma.sharedLink.findFirst({
      where: { token, revokedAt: null },
      select: { id: true, document: { select: { userId: true } } },
    })
    if (!link) return false
    const comment = await prisma.sharedComment.findFirst({
      where: { id: commentId, sharedLinkId: link.id },
      select: { id: true, userId: true },
    })
    if (!comment) return false
    const isOwner = link.document.userId === userId
    const isAuthor = comment.userId !== null && comment.userId === userId
    if (!isOwner && !isAuthor) return false
    await prisma.sharedComment.delete({ where: { id: commentId } })
    return true
  },

  async recordView(token: string, userId: string) {
    const link = await prisma.sharedLink.findFirst({
      where: { token, revokedAt: null },
      select: { id: true },
    })
    if (!link) {
      throw new SharingError('Enlace no encontrado', 'SHARED_NOT_FOUND', 404)
    }
    await prisma.sharedView.upsert({
      where: { sharedLinkId_userId: { sharedLinkId: link.id, userId } },
      update: { lastViewedAt: new Date() },
      create: { sharedLinkId: link.id, userId },
    })
    return true
  },

  async listSharedWithMe(userId: string) {
    const views = await prisma.sharedView.findMany({
      where: { userId, sharedLink: { revokedAt: null } },
      orderBy: { lastViewedAt: 'desc' },
      include: {
        sharedLink: {
          select: {
            token: true,
            allowComments: true,
            document: { select: { id: true, title: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    })
    return views.map((view) => ({
      token: view.sharedLink.token,
      documentId: view.sharedLink.document.id,
      title: view.sharedLink.document.title,
      ownerName: view.sharedLink.createdBy.name ?? 'Anónimo',
      lastViewedAt: view.lastViewedAt.toISOString(),
      allowComments: view.sharedLink.allowComments,
    }))
  },
}
