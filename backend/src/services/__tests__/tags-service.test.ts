import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: {
    project: { findFirst: vi.fn() },
    tag: { findMany: vi.fn(), findFirst: vi.fn(), findManyByName: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: db }))

import { tagsService, TAG_KINDS } from '../tags-service.js'

describe('tags-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.tag.findFirst.mockResolvedValue(null)
    db.tag.findMany.mockResolvedValue([])
    db.tag.create.mockImplementation(async (args: { data: { name: string; kind: string } }) => ({ id: 't1', ...args.data }))
    db.tag.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({ id: 't1', ...args.data }))
  })

  it('rejects unknown kinds to freeform', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    await tagsService.create('p1', 'u1', { name: ' Angst ', kind: 'weird' })
    expect(db.tag.create).toHaveBeenCalledWith({
      data: { projectId: 'p1', name: 'Angst', kind: 'freeform' },
    })
  })

  it('reuses an existing tag case-insensitively', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    db.tag.findFirst.mockResolvedValue({ id: 't9', name: 'Angst', kind: 'freeform' })
    await tagsService.create('p1', 'u1', { name: 'ANGST', kind: 'fandom' })
    expect(db.tag.create).not.toHaveBeenCalled()
    expect(db.tag.update).toHaveBeenCalledWith({ where: { id: 't9' }, data: { name: 'ANGST', kind: 'fandom' } })
  })

  it('seeds tags from storyMeta on first list', async () => {
    db.project.findFirst.mockResolvedValue({
      id: 'p1',
      storyMeta: {
        tags: ['Dead Dove: Do Not Eat'],
        fandoms: ['Genshin'],
        ships: ['Ada/Lin'],
        categories: ['F/M'],
        rating: 'explicit',
      },
      tags: [],
    })
    db.tag.upsert.mockResolvedValue({})
    db.tag.findMany.mockResolvedValue([])
    await tagsService.list('p1', 'u1')
    const names = db.tag.upsert.mock.calls.map(([args]) => args.create.name)
    expect(names).toEqual(['Dead Dove: Do Not Eat', 'Genshin', 'Ada/Lin', 'F/M', 'explicit'])
    const kinds = db.tag.upsert.mock.calls.map(([args]) => args.create.kind)
    expect(kinds).toEqual(['freeform', 'fandom', 'relationship', 'category', 'rating'])
  })

  it('does not reseed when tags already exist', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1', storyMeta: { tags: ['x'] }, tags: [{ id: 't1' }] })
    db.tag.findMany.mockResolvedValue([])
    await tagsService.list('p1', 'u1')
    expect(db.tag.upsert).not.toHaveBeenCalled()
  })

  it('returns null for a project the user does not own', async () => {
    db.project.findFirst.mockResolvedValue(null)
    expect(await tagsService.list('p1', 'intruso')).toBeNull()
    expect(await tagsService.create('p1', 'intruso', { name: 'x' })).toBeNull()
  })

  it('rejects empty names', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    expect(await tagsService.create('p1', 'u1', { name: '   ' })).toBeNull()
    expect(db.tag.upsert).not.toHaveBeenCalled()
  })

  it('renames a tag scoped to owner projects', async () => {
    db.tag.findFirst.mockResolvedValue({ id: 't1', name: 'old', kind: 'freeform' })
    db.tag.update.mockResolvedValue({ id: 't1', name: 'new', kind: 'fandom' })
    const result = await tagsService.update('t1', 'u1', { name: ' new ', kind: 'fandom' })
    expect(db.tag.findFirst).toHaveBeenCalledWith({ where: { id: 't1', project: { userId: 'u1' } } })
    expect(result).toEqual({ id: 't1', name: 'new', kind: 'fandom' })
  })

  it('deletes only owned tags', async () => {
    db.tag.findFirst.mockResolvedValue(null)
    expect(await tagsService.remove('t1', 'intruso')).toBe(false)
    expect(db.tag.delete).not.toHaveBeenCalled()
    db.tag.findFirst.mockResolvedValue({ id: 't1' })
    db.tag.delete.mockResolvedValue({})
    expect(await tagsService.remove('t1', 'u1')).toBe(true)
  })

  it('exposes every AO3 kind', () => {
    expect([...TAG_KINDS]).toEqual(['rating', 'warning', 'category', 'fandom', 'relationship', 'character', 'freeform'])
  })
})
