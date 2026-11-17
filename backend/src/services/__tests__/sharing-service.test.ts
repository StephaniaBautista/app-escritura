import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: {
    document: { findFirst: vi.fn() },
    sharedLink: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    sharedComment: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    sharedView: { upsert: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: db }))

import { SharingError, sharingService } from '../sharing-service.js'

const content = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Ada llega al puerto.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'El barco zarpa.' }] },
  ],
}

function linkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    token: 'tok-abc',
    includeChildren: true,
    allowComments: true,
    createdAt: new Date(),
    document: {
      id: 'd1',
      title: 'Capítulo 1',
      content,
      userId: 'owner-1',
      children: [{ id: 'd2', title: 'Escena', content, order: 0 }],
    },
    createdBy: { id: 'owner-1', name: 'Ivar' },
    ...overrides,
  }
}

describe('sharing-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('links', () => {
    it('creates a link only for the owner and rotates previous links', async () => {
      db.document.findFirst.mockResolvedValue({ id: 'd1' })
      db.sharedLink.deleteMany.mockResolvedValue({ count: 1 })
      db.sharedLink.create.mockResolvedValue({ id: 'l2', token: 'tok-new' })
      const link = await sharingService.createLink('d1', 'owner-1', { includeChildren: true })
      expect(db.document.findFirst).toHaveBeenCalledWith({ where: { id: 'd1', userId: 'owner-1' }, select: { id: true } })
      expect(db.sharedLink.deleteMany).toHaveBeenCalledWith({ where: { documentId: 'd1', revokedAt: null } })
      expect(link).toEqual({ id: 'l2', token: 'tok-new' })
    })

    it('refuses link creation for non-owners', async () => {
      db.document.findFirst.mockResolvedValue(null)
      expect(await sharingService.createLink('d1', 'intruso', {})).toBeNull()
      expect(db.sharedLink.create).not.toHaveBeenCalled()
    })

    it('revokes active links for the owner only', async () => {
      db.document.findFirst.mockResolvedValue(null)
      expect(await sharingService.revokeLink('d1', 'intruso')).toBe(false)
      db.document.findFirst.mockResolvedValue({ id: 'd1' })
      db.sharedLink.updateMany.mockResolvedValue({ count: 1 })
      expect(await sharingService.revokeLink('d1', 'owner-1')).toBe(true)
      expect(db.sharedLink.updateMany).toHaveBeenCalledWith({
        where: { documentId: 'd1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('fails to read revoked or unknown tokens', async () => {
      db.sharedLink.findFirst.mockResolvedValue(null)
      await expect(sharingService.readShared('nope')).rejects.toThrow(SharingError)
    })
  })

  describe('readShared', () => {
    it('exposes only title, blocks, owner display name and comments', async () => {
      db.sharedLink.findFirst.mockResolvedValue(linkRow())
      db.sharedComment.findMany.mockResolvedValue([])
      const payload = await sharingService.readShared('tok-abc')
      expect(payload.title).toBe('Capítulo 1')
      expect(payload.blocks).toEqual([
        { type: 'paragraph', text: 'Ada llega al puerto.' },
        { type: 'paragraph', text: 'El barco zarpa.' },
      ])
      expect(payload.ownerName).toBe('Ivar')
      expect(payload.children).toEqual([
        {
          title: 'Escena',
          blocks: [
            { type: 'paragraph', text: 'Ada llega al puerto.' },
            { type: 'paragraph', text: 'El barco zarpa.' },
          ],
        },
      ])
      expect(Object.keys(payload).sort()).toEqual(
        ['allowComments', 'blocks', 'children', 'comments', 'includeChildren', 'ownerName', 'title', 'token'].sort(),
      )
    })

    it('omits children when includeChildren is off', async () => {
      db.sharedLink.findFirst.mockResolvedValue(linkRow({ includeChildren: false }))
      db.sharedComment.findMany.mockResolvedValue([])
      const payload = await sharingService.readShared('tok-abc')
      expect(payload.children).toEqual([])
    })
  })

  describe('comments', () => {
    it('creates comments anchored to a paragraph with anonymous default', async () => {
      db.sharedLink.findFirst.mockResolvedValue(linkRow())
      db.sharedComment.create.mockResolvedValue({
        id: 'c1',
        blockIndex: 1,
        quote: 'El barco zarpa.',
        body: 'Mejorar el ritmo',
        authorName: 'Anónimo',
        resolvedAt: null,
        createdAt: new Date('2026-10-10T10:00:00Z'),
      })
      const comment = await sharingService.addComment(
        'tok-abc',
        { blockIndex: 1, quote: 'El barco zarpa.', body: '  Mejorar el ritmo  ' },
        null,
      )
      expect(db.sharedComment.create).toHaveBeenCalledWith({
        data: {
          sharedLinkId: 'l1',
          blockIndex: 1,
          quote: 'El barco zarpa.',
          body: 'Mejorar el ritmo',
          authorName: 'Anónimo',
          userId: null,
        },
      })
      expect(comment.authorName).toBe('Anónimo')
      expect(comment.orphan).toBe(false)
    })

    it('rejects empty comments and comments when disabled', async () => {
      db.sharedLink.findFirst.mockResolvedValue(linkRow())
      await expect(sharingService.addComment('tok-abc', { blockIndex: 0, body: '   ' }, null)).rejects.toThrow(SharingError)
      db.sharedLink.findFirst.mockResolvedValue(linkRow({ allowComments: false }))
      await expect(sharingService.addComment('tok-abc', { blockIndex: 0, body: 'hola' }, null)).rejects.toMatchObject({
        code: 'COMMENTS_DISABLED',
      })
    })

    it('re-anchors comments when the paragraph moved', async () => {
      db.sharedLink.findFirst.mockResolvedValue(linkRow())
      db.sharedComment.create.mockResolvedValue({
        id: 'c1',
        blockIndex: 0,
        quote: 'El barco zarpa.',
        body: 'ok',
        authorName: 'Anónimo',
        resolvedAt: null,
        createdAt: new Date(),
      })
      const comment = await sharingService.addComment('tok-abc', { blockIndex: 0, quote: 'El barco zarpa.', body: 'ok' }, null)
      expect(comment.effectiveBlockIndex).toBe(1)
    })

    it('lets only the owner resolve comments', async () => {
      db.sharedLink.findFirst.mockResolvedValue({
        id: 'l1',
        document: { userId: 'owner-1' },
      })
      db.sharedComment.update.mockResolvedValue({ id: 'c1' })
      expect(await sharingService.resolveComment('tok-abc', 'c1', 'intruso', true)).toBeNull()
      expect(await sharingService.resolveComment('tok-abc', 'c1', 'owner-1', true)).toEqual({ id: 'c1' })
    })

    it('lets the author or the owner delete comments', async () => {
      db.sharedLink.findFirst.mockResolvedValue({ id: 'l1', document: { userId: 'owner-1' } })
      db.sharedComment.findFirst.mockResolvedValue({ id: 'c1', userId: 'author-1' })
      expect(await sharingService.deleteComment('tok-abc', 'c1', 'intruso')).toBe(false)
      expect(db.sharedComment.delete).not.toHaveBeenCalled()
      expect(await sharingService.deleteComment('tok-abc', 'c1', 'author-1')).toBe(true)
      expect(await sharingService.deleteComment('tok-abc', 'c1', 'owner-1')).toBe(true)
    })
  })

  describe('views', () => {
    it('records views for logged-in visitors', async () => {
      db.sharedLink.findFirst.mockResolvedValue({ id: 'l1' })
      db.sharedView.upsert.mockResolvedValue({})
      await sharingService.recordView('tok-abc', 'u1')
      expect(db.sharedView.upsert).toHaveBeenCalledWith({
        where: { sharedLinkId_userId: { sharedLinkId: 'l1', userId: 'u1' } },
        update: { lastViewedAt: expect.any(Date) },
        create: { sharedLinkId: 'l1', userId: 'u1' },
      })
    })

    it('lists shared documents for the current user', async () => {
      db.sharedView.findMany.mockResolvedValue([
        {
          lastViewedAt: new Date('2026-10-10T10:00:00Z'),
          sharedLink: {
            token: 'tok-abc',
            allowComments: true,
            document: { id: 'd1', title: 'Capítulo 1' },
            createdBy: { id: 'owner-1', name: 'Ivar' },
          },
        },
      ])
      const list = await sharingService.listSharedWithMe('u1')
      expect(list).toEqual([
        {
          token: 'tok-abc',
          documentId: 'd1',
          title: 'Capítulo 1',
          ownerName: 'Ivar',
          lastViewedAt: '2026-10-10T10:00:00.000Z',
          allowComments: true,
        },
      ])
    })
  })
})
