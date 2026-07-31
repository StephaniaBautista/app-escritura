import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    document: { findFirst: vi.fn(), update: vi.fn() },
    documentVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('@generated/client', () => ({ Prisma: { InputJsonValue: Symbol('json') } }))

import { versionService, MAX_VERSIONS_PER_DOCUMENT } from './version-service.js'

const docRow = { id: 'doc-1', title: 'Capítulo 1', content: { type: 'doc', content: [] }, type: 'document', order: 0, userId: 'user-1', projectId: 'proj-1', folderId: null, parentId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') }

const versionRow = (version: number) => ({
  id: `ver-${version}`,
  documentId: 'doc-1',
  title: 'Capítulo 1',
  content: { type: 'doc', content: [] },
  version,
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
})

describe('versionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list: filtra por documento y usuario, ordena por versión descendente', async () => {
    prismaMock.documentVersion.findMany.mockResolvedValue([versionRow(2), versionRow(1)])

    const versions = await versionService.list('doc-1', 'user-1')

    expect(prismaMock.documentVersion.findMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1', userId: 'user-1' },
      orderBy: { version: 'desc' },
    })
    expect(versions).toHaveLength(2)
  })

  it('create: guarda snapshot del título y contenido actual con versión incrementada', async () => {
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.documentVersion.findFirst.mockResolvedValue(versionRow(2))
    prismaMock.documentVersion.create.mockResolvedValue(versionRow(3))
    prismaMock.documentVersion.count.mockResolvedValue(3)

    const created = await versionService.create('doc-1', 'user-1')

    expect(prismaMock.documentVersion.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc-1',
        userId: 'user-1',
        title: 'Capítulo 1',
        content: docRow.content,
        version: 3,
      },
    })
    expect(created).toEqual(versionRow(3))
  })

  it('create: empieza en versión 1 si no hay versiones previas', async () => {
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.documentVersion.findFirst.mockResolvedValue(null)
    prismaMock.documentVersion.create.mockResolvedValue(versionRow(1))
    prismaMock.documentVersion.count.mockResolvedValue(1)

    await versionService.create('doc-1', 'user-1')

    const createCall = prismaMock.documentVersion.create.mock.calls[0][0]
    expect(createCall.data.version).toBe(1)
  })

  it('create: devuelve null si el documento no pertenece al usuario', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)

    const created = await versionService.create('doc-1', 'user-1')

    expect(created).toBeNull()
    expect(prismaMock.documentVersion.create).not.toHaveBeenCalled()
  })

  it('enforceLimit: borra las versiones más antiguas cuando excede el máximo', async () => {
    prismaMock.documentVersion.count.mockResolvedValue(MAX_VERSIONS_PER_DOCUMENT + 5)
    prismaMock.documentVersion.findMany.mockResolvedValue(
      Array.from({ length: MAX_VERSIONS_PER_DOCUMENT }, (_, i) => ({ id: `keep-${MAX_VERSIONS_PER_DOCUMENT - i}` }))
    )
    prismaMock.documentVersion.deleteMany.mockResolvedValue({ count: 5 })

    await versionService.enforceLimit('doc-1')

    expect(prismaMock.documentVersion.findMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1' },
      orderBy: { version: 'desc' },
      take: MAX_VERSIONS_PER_DOCUMENT,
      select: { id: true },
    })
    expect(prismaMock.documentVersion.deleteMany).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        id: { notIn: expect.any(Array) },
      },
    })
  })

  it('enforceLimit: no borra nada si no excede el máximo', async () => {
    prismaMock.documentVersion.count.mockResolvedValue(3)

    await versionService.enforceLimit('doc-1')

    expect(prismaMock.documentVersion.deleteMany).not.toHaveBeenCalled()
  })

  it('restore: reescribe título y contenido del documento', async () => {
    const oldVersion = { ...versionRow(1), title: 'Título viejo', content: { type: 'doc', content: [{ type: 'paragraph' }] } }
    prismaMock.documentVersion.findFirst.mockResolvedValue(oldVersion)
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.document.update.mockResolvedValue({ ...docRow, title: 'Título viejo', content: oldVersion.content })

    const restored = await versionService.restore('ver-1', 'user-1')

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { title: 'Título viejo', content: oldVersion.content },
    })
    expect(restored?.title).toBe('Título viejo')
  })

  it('restore: devuelve null si la versión no pertenece al usuario', async () => {
    prismaMock.documentVersion.findFirst.mockResolvedValue(null)

    const restored = await versionService.restore('ver-1', 'user-1')

    expect(restored).toBeNull()
    expect(prismaMock.document.update).not.toHaveBeenCalled()
  })

  it('get: devuelve la versión solo si pertenece al usuario', async () => {
    prismaMock.documentVersion.findFirst.mockResolvedValue(versionRow(1))

    const version = await versionService.get('ver-1', 'user-1')

    expect(prismaMock.documentVersion.findFirst).toHaveBeenCalledWith({ where: { id: 'ver-1', userId: 'user-1' } })
    expect(version).toEqual(versionRow(1))
  })
})
