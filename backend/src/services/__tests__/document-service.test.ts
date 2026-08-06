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
    folder: {
      findFirst: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    branch: {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('@generated/client', () => ({ Prisma: { JsonNull: 'JSON_NULL' } }))

import { projectService, documentService } from '../document-service.js'

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

describe('projectService.storyMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('create: guarda la metadata del wizard en storyMeta', async () => {
    const storyMeta = { rating: 'mature', isFanfic: true, fandom: 'HP' }
    prismaMock.project.create.mockResolvedValue({ ...projectRow, storyMeta })

    await projectService.create('user-1', { name: 'Mi novela', storyMeta: storyMeta as never })

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Mi novela',
        description: undefined,
        storyMeta,
        userId: 'user-1',
      },
    })
  })

  it('create: usa {} como storyMeta por defecto', async () => {
    prismaMock.project.create.mockResolvedValue({ ...projectRow, storyMeta: {} })

    await projectService.create('user-1', { name: 'Mi novela' })

    const call = prismaMock.project.create.mock.calls[0][0]
    expect(call.data.storyMeta).toEqual({})
  })

  it('update: propaga storyMeta al actualizar', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.project.update.mockResolvedValue({ ...projectRow, storyMeta: { rating: 'teen' } })

    await projectService.update('folder-1', 'user-1', { storyMeta: { rating: 'teen' } as never })

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
      data: { name: undefined, description: undefined, storyMeta: { rating: 'teen' } },
    })
  })

  it('updateStoryMeta: guarda la metadata solo si el proyecto pertenece al usuario', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.project.update.mockResolvedValue({ ...projectRow, storyMeta: { tags: ['slow burn'] } })

    const updated = await projectService.updateStoryMeta('folder-1', 'user-1', { tags: ['slow burn'] } as never)

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({ where: { id: 'folder-1', userId: 'user-1' } })
    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
      data: { storyMeta: { tags: ['slow burn'] } },
    })
    expect(updated).toBeTruthy()
  })

  it('updateStoryMeta: devuelve null si no pertenece al usuario', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    const updated = await projectService.updateStoryMeta('folder-1', 'user-1', { rating: 'general' } as never)

    expect(updated).toBeNull()
    expect(prismaMock.project.update).not.toHaveBeenCalled()
  })
})

describe('documentService.create — ownership (anti-IDOR)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crea el documento cuando el proyecto pertenece al usuario', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    prismaMock.document.create.mockResolvedValue({ id: 'doc-1', title: 'Capítulo 1' })
    prismaMock.branch.findFirst.mockResolvedValue({ id: 'branch-1' })

    const doc = await documentService.create('user-1', { title: 'Capítulo 1', projectId: 'proj-1' })

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'proj-1', userId: 'user-1' },
      select: { id: true },
    })
    expect(prismaMock.document.create).toHaveBeenCalled()
    expect(doc).toEqual({ id: 'doc-1', title: 'Capítulo 1' })
  })

  it('rechaza crear en un proyecto ajeno (null, sin insert)', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    const doc = await documentService.create('user-1', { title: 'Intruso', projectId: 'proj-ajeno' })

    expect(doc).toBeNull()
    expect(prismaMock.document.create).not.toHaveBeenCalled()
  })

  it('rechaza folderId de un proyecto ajeno', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    prismaMock.folder.findFirst.mockResolvedValue(null)

    const doc = await documentService.create('user-1', {
      title: 'Intruso',
      projectId: 'proj-1',
      folderId: 'folder-ajena',
    })

    expect(doc).toBeNull()
    expect(prismaMock.document.create).not.toHaveBeenCalled()
    expect(prismaMock.folder.findFirst).toHaveBeenCalledWith({
      where: { id: 'folder-ajena', projectId: 'proj-1' },
      select: { id: true },
    })
  })

  it('rechaza parentId de un proyecto o usuario ajeno', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1' })
    prismaMock.document.findFirst.mockResolvedValue(null)

    const doc = await documentService.create('user-1', {
      title: 'Intruso',
      projectId: 'proj-1',
      parentId: 'doc-ajeno',
    })

    expect(doc).toBeNull()
    expect(prismaMock.document.create).not.toHaveBeenCalled()
  })
})

describe('documentService.update — ownership (anti-IDOR)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza mover el documento a una carpeta de otro proyecto', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      title: 'Capítulo 1',
      projectId: 'proj-1',
      content: {},
      type: 'chapter',
      order: 0,
      userId: 'user-1',
      folderId: null,
      parentId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      autoVersionState: {},
    })
    prismaMock.folder.findFirst.mockResolvedValue(null)

    const doc = await documentService.update('doc-1', 'user-1', { folderId: 'folder-ajena' })

    expect(doc).toBeNull()
    expect(prismaMock.document.update).not.toHaveBeenCalled()
    expect(prismaMock.folder.findFirst).toHaveBeenCalledWith({
      where: { id: 'folder-ajena', projectId: 'proj-1' },
      select: { id: true },
    })
  })

  it('rechaza re-padrear a un documento de otro usuario', async () => {
    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 'doc-1',
      title: 'Capítulo 1',
      projectId: 'proj-1',
      content: {},
      type: 'chapter',
      order: 0,
      userId: 'user-1',
      folderId: null,
      parentId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      autoVersionState: {},
    })
    prismaMock.document.findFirst.mockResolvedValueOnce(null)

    const doc = await documentService.update('doc-1', 'user-1', { parentId: 'doc-ajeno' })

    expect(doc).toBeNull()
    expect(prismaMock.document.update).not.toHaveBeenCalled()
  })

  it('permite actualizar título y content sin revalidar targets', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      title: 'Capítulo 1',
      projectId: 'proj-1',
      content: {},
      type: 'chapter',
      order: 0,
      userId: 'user-1',
      folderId: null,
      parentId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      autoVersionState: {},
    })
    prismaMock.document.update.mockResolvedValue({ id: 'doc-1', title: 'Renombrado' })

    const doc = await documentService.update('doc-1', 'user-1', { title: 'Renombrado' })

    expect(doc).toEqual({ id: 'doc-1', title: 'Renombrado' })
    expect(prismaMock.folder.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.document.findFirst).toHaveBeenCalledTimes(1)
  })

  it('permite desvincular parentId a null', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      title: 'Capítulo 1',
      projectId: 'proj-1',
      content: {},
      type: 'chapter',
      order: 0,
      userId: 'user-1',
      folderId: null,
      parentId: 'parent-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      autoVersionState: {},
    })
    prismaMock.document.update.mockResolvedValue({ id: 'doc-1', parentId: null })

    const doc = await documentService.update('doc-1', 'user-1', { parentId: null })

    expect(prismaMock.document.findFirst).toHaveBeenCalledTimes(1)
    expect(prismaMock.document.update).toHaveBeenCalled()
  })
})

describe('documentService.duplicate — sin N+1', () => {
  const root = {
    id: 'doc-1',
    projectId: 'proj-1',
    parentId: null,
    title: 'Capítulo 1',
    content: { type: 'doc', content: [] },
    type: 'document',
    order: 0,
    folderId: null,
  }
  const child = {
    id: 'doc-2',
    projectId: 'proj-1',
    parentId: 'doc-1',
    title: 'Escena 1',
    content: { type: 'doc', content: [] },
    type: 'subpage',
    order: 0,
    folderId: null,
  }
  const grandchild = {
    id: 'doc-3',
    projectId: 'proj-1',
    parentId: 'doc-2',
    title: 'Detalle',
    content: { type: 'doc', content: [] },
    type: 'subpage',
    order: 0,
    folderId: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('duplica el árbol completo en una sola pasada y crea las ramas main con createMany', async () => {
    prismaMock.document.findFirst.mockResolvedValue(root)
    prismaMock.document.findMany.mockResolvedValue([root, child, grandchild])
    prismaMock.document.create.mockImplementation(({ data }: { data: { title: string } }) =>
      Promise.resolve({ id: `new-${data.title}` }),
    )
    prismaMock.branch.createMany.mockResolvedValue({ count: 3 })

    const duplicated = await documentService.duplicate('doc-1', 'user-1')

    expect(duplicated).toEqual({ id: 'new-Capítulo 1 (Copia)' })
    expect(prismaMock.document.findMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.document.create).toHaveBeenCalledTimes(3)

    const parentIds = prismaMock.document.create.mock.calls.map(([args]) => args.data.parentId)
    expect(parentIds).toContain('new-Capítulo 1 (Copia)')
    expect(parentIds).toContain('new-Escena 1')

    expect(prismaMock.branch.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { documentId: 'new-Capítulo 1 (Copia)', name: 'main', userId: 'user-1' },
        { documentId: 'new-Escena 1', name: 'main', userId: 'user-1' },
        { documentId: 'new-Detalle', name: 'main', userId: 'user-1' },
      ]),
    })
  })

  it('no hace N+1: usa una única query de subárbol, sin findFirst por hijo', async () => {
    prismaMock.document.findFirst.mockResolvedValue(root)
    prismaMock.document.findMany.mockResolvedValue([root, child, grandchild])
    prismaMock.document.create.mockImplementation(({ data }: { data: { title: string } }) =>
      Promise.resolve({ id: `new-${data.title}` }),
    )
    prismaMock.branch.createMany.mockResolvedValue({ count: 3 })

    await documentService.duplicate('doc-1', 'user-1')

    const findManyCalls = prismaMock.document.findMany.mock.calls.length
    expect(findManyCalls).toBe(1)
  })

  it('devuelve null si el documento no existe o no pertenece al usuario', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)

    const duplicated = await documentService.duplicate('doc-ajeno', 'user-1')

    expect(duplicated).toBeNull()
    expect(prismaMock.document.findMany).not.toHaveBeenCalled()
  })
})