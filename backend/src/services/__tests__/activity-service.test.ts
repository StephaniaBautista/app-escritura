import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    activity: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { activityService } from '../activity-service.js'

const activityRow = {
  id: 'a1',
  type: 'document_created',
  title: 'Capítulo 1',
  folderId: 'proj-1',
  documentId: 'doc-1',
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
}

describe('activityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list: devuelve solo la actividad del usuario, ordenada desc y limitada a 20', async () => {
    prismaMock.activity.findMany.mockResolvedValue([activityRow])

    const items = await activityService.list('user-1')

    expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    expect(items).toHaveLength(1)
  })

  it('create: guarda la actividad con ownership del usuario', async () => {
    prismaMock.activity.create.mockResolvedValue(activityRow)

    const created = await activityService.create('user-1', {
      type: 'document_created',
      title: 'Capítulo 1',
      folderId: 'proj-1',
      documentId: 'doc-1',
    })

    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        type: 'document_created',
        title: 'Capítulo 1',
        folderId: 'proj-1',
        documentId: 'doc-1',
        userId: 'user-1',
      },
    })
    expect(created).toEqual(activityRow)
  })

  it('removeByDocument: borra solo las del documento y del usuario', async () => {
    await activityService.removeByDocument('doc-1', 'user-1')
    expect(prismaMock.activity.deleteMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1', userId: 'user-1' },
    })
  })

  it('removeByFolder: borra solo las de la carpeta y del usuario', async () => {
    await activityService.removeByFolder('proj-1', 'user-1')
    expect(prismaMock.activity.deleteMany).toHaveBeenCalledWith({
      where: { folderId: 'proj-1', userId: 'user-1' },
    })
  })
})
