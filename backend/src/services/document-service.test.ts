import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('@generated/client', () => ({ Prisma: { JsonNull: 'JSON_NULL' } }))

import { projectService } from './document-service.js'

const projectRow = {
  id: 'folder-1',
  name: 'Mi novela',
  description: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  folders: [],
  documents: [],
}

const treeRow = [
  { id: 'doc-1', title: 'Capítulo 1', type: 'document', parentId: null, order: 0, updatedAt: new Date('2026-01-01') },
]

describe('projectService.getProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve el proyecto con su tree en una sola respuesta', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.document.findMany.mockResolvedValue(treeRow)

    const page = await projectService.getProjectPage('folder-1', 'user-1')

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'folder-1', userId: 'user-1' },
      include: expect.any(Object),
    })
    expect(prismaMock.document.findMany).toHaveBeenCalledWith({
      where: { projectId: 'folder-1', userId: 'user-1' },
      orderBy: expect.any(Array),
      select: expect.any(Object),
    })
    expect(page).toEqual({ ...projectRow, tree: treeRow })
  })

  it('respeta el ownership: filtra por id Y userId', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.document.findMany.mockResolvedValue(treeRow)

    await projectService.getProjectPage('folder-1', 'user-1')

    const projectCall = prismaMock.project.findFirst.mock.calls[0][0]
    expect(projectCall.where).toEqual({ id: 'folder-1', userId: 'user-1' })

    const treeCall = prismaMock.document.findMany.mock.calls[0][0]
    expect(treeCall.where).toEqual({ projectId: 'folder-1', userId: 'user-1' })
  })

  it('devuelve null si el proyecto no existe o no pertenece al usuario', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    const page = await projectService.getProjectPage('folder-1', 'user-1')

    expect(page).toBeNull()
  })
})
