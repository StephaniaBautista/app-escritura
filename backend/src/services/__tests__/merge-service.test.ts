import { describe, it, expect, vi, beforeEach } from 'vitest'

const { branchServiceMock, prismaMock } = vi.hoisted(() => ({
  branchServiceMock: { get: vi.fn() },
  prismaMock: {
    document: { findFirst: vi.fn() },
    documentVersion: { findFirst: vi.fn(), create: vi.fn() },
    versionParent: { createMany: vi.fn() },
  },
}))

vi.mock('../branch-service.js', () => ({ branchService: branchServiceMock }))
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('@generated/client', () => ({ Prisma: { InputJsonValue: Symbol('json') } }))

import { mergeService } from '../merge-service.js'
import type { Prisma } from '@generated/client'

type Json = Prisma.JsonValue

const branch = (id: string, name: string, sourceVersionId: string | null) => ({
  id,
  documentId: 'doc-1',
  name,
  sourceVersionId,
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
  isMain: name === 'main',
})

const p = (text: string): Json => ({ type: 'paragraph', content: [{ type: 'text', text }] }) as Json
const doc = (content: Json[]): Json => ({ type: 'doc', content }) as Json

const versionRow = (id: string, branchId: string, content: unknown, title = 'Capítulo 1', version = 1) => ({
  id,
  documentId: 'doc-1',
  branchId,
  title,
  content,
  version,
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
})

describe('mergeService.merge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      title: 'Capítulo 1',
      content: doc([]),
      userId: 'user-1',
    })
    prismaMock.documentVersion.create.mockImplementation(({ data }) =>
      Promise.resolve(versionRow('commit-1', data.branchId as string, data.content as unknown, data.title as string, data.version as number)),
    )
  })

  it('devuelve null si alguna rama no existe o es la misma rama', async () => {
    branchServiceMock.get.mockResolvedValue(null)
    expect(await mergeService.merge('src', 'tgt', 'user-1')).toBeNull()

    branchServiceMock.get.mockImplementation((id: string) => Promise.resolve(branch(id, 'main', null)))
    expect(await mergeService.merge('src', 'src', 'user-1')).toBeNull()
  })

  it('merge sin conflictos crea merge commit con dos padres y versión incrementada', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'base-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const baseRow = versionRow('base-1', 'main', doc([p('uno'), p('dos')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('uno'), p('dos')]), 'Capítulo 1', 2)
    const sourceHead = versionRow('src-head', 'src', doc([p('uno'), p('dos'), p('tres')]), 'Capítulo 1', 1)

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 2 })
      if (where.id === 'base-1') return Promise.resolve(baseRow)
      if (where.branchId === 'src') return Promise.resolve(sourceHead)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(null)
    })

    const result = await mergeService.merge('src', 'tgt', 'user-1')

    expect(result?.merged).toBe(true)
    expect(prismaMock.documentVersion.create).toHaveBeenCalledTimes(1)
    const createCall = prismaMock.documentVersion.create.mock.calls[0][0]
    expect(createCall.data.branchId).toBe('tgt')
    expect(createCall.data.version).toBe(3)
    expect(createCall.data.content).toEqual(doc([p('uno'), p('dos'), p('tres')]))
    expect(prismaMock.versionParent.createMany).toHaveBeenCalledWith({
      data: [
        { versionId: 'commit-1', parentId: 'tgt-head' },
        { versionId: 'commit-1', parentId: 'src-head' },
      ],
    })
  })

  it('detecta conflicto cuando ambas ramas modifican el mismo nodo distinto', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'base-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const baseRow = versionRow('base-1', 'main', doc([p('original')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('mio')]), 'Capítulo 1', 2)
    const sourceHead = versionRow('src-head', 'src', doc([p('de ellos')]), 'Capítulo 1', 1)

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 2 })
      if (where.id === 'base-1') return Promise.resolve(baseRow)
      if (where.branchId === 'src') return Promise.resolve(sourceHead)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(null)
    })

    const result = await mergeService.merge('src', 'tgt', 'user-1')

    expect(result?.merged).toBe(false)
    expect(result?.conflicts).toHaveLength(1)
    expect(result?.conflicts?.[0].index).toBe(0)
    expect(result?.conflicts?.[0].ours).toEqual(p('mio'))
    expect(result?.conflicts?.[0].theirs).toEqual(p('de ellos'))
    expect(prismaMock.documentVersion.create).not.toHaveBeenCalled()
    expect(result?.mergedContent?.content[0]).toEqual(p('original'))
  })

  it('aplica cambios no conflictivos (solo una rama modificó) y añade extras de una sola rama', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'base-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const baseRow = versionRow('base-1', 'main', doc([p('a'), p('b')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('a-cambiado'), p('b')]), 'Capítulo 1', 2)
    const sourceHead = versionRow('src-head', 'src', doc([p('a'), p('b'), p('extra')]), 'Capítulo 1', 1)

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 2 })
      if (where.id === 'base-1') return Promise.resolve(baseRow)
      if (where.branchId === 'src') return Promise.resolve(sourceHead)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(null)
    })

    const result = await mergeService.merge('src', 'tgt', 'user-1')

    expect(result?.merged).toBe(true)
    expect(result?.version?.content).toEqual(doc([p('a-cambiado'), p('b'), p('extra')]))
    expect(result?.conflicts).toBeUndefined()
  })

  it('conflicto de tipo added cuando ambas ramas añaden contenido distinto al final', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'base-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const baseRow = versionRow('base-1', 'main', doc([p('a')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('a'), p('final-mio')]), 'Capítulo 1', 2)
    const sourceHead = versionRow('src-head', 'src', doc([p('a'), p('final-ellos')]), 'Capítulo 1', 1)

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 2 })
      if (where.id === 'base-1') return Promise.resolve(baseRow)
      if (where.branchId === 'src') return Promise.resolve(sourceHead)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(null)
    })

    const result = await mergeService.merge('src', 'tgt', 'user-1')

    expect(result?.merged).toBe(false)
    expect(result?.conflicts).toHaveLength(1)
    expect(result?.conflicts?.[0].kind).toBe('added')
    expect(result?.conflicts?.[0].index).toBe(1)
  })

  it('con resolución, crea merge commit con el contenido resuelto', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'base-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const baseRow = versionRow('base-1', 'main', doc([p('original')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('mio')]), 'Capítulo 1', 2)
    const sourceHead = versionRow('src-head', 'src', doc([p('de ellos')]), 'Capítulo 1', 1)

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 2 })
      if (where.id === 'base-1') return Promise.resolve(baseRow)
      if (where.branchId === 'src') return Promise.resolve(sourceHead)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(null)
    })

    const resolved = doc([p('elegido')])
    const result = await mergeService.merge('src', 'tgt', 'user-1', { content: resolved })

    expect(result?.merged).toBe(true)
    const createCall = prismaMock.documentVersion.create.mock.calls[0][0]
    expect(createCall.data.content).toEqual(resolved)
  })

  it('rama sin versiones propias usa su sourceVersion como head', async () => {
    branchServiceMock.get.mockImplementation((id: string) => {
      if (id === 'src') return Promise.resolve(branch('src', 'feature', 'fork-1'))
      return Promise.resolve(branch('tgt', 'main', null))
    })

    const forkRow = versionRow('fork-1', 'main', doc([p('a'), p('b')]))
    const targetHead = versionRow('tgt-head', 'main', doc([p('a'), p('b'), p('c')]), 'Capítulo 1', 3)
    const sourceVersionRow = versionRow('fork-1', 'main', doc([p('a'), p('b')]))

    prismaMock.documentVersion.findFirst.mockImplementation((args) => {
      const where = args?.where ?? {}
      if (args?.select) return Promise.resolve({ version: 3 })
      if (where.id === 'fork-1') return Promise.resolve(forkRow)
      if (where.branchId === 'src') return Promise.resolve(null)
      if (where.branchId === 'tgt') return Promise.resolve(targetHead)
      return Promise.resolve(sourceVersionRow)
    })

    const result = await mergeService.merge('src', 'tgt', 'user-1')

    expect(result?.merged).toBe(true)
    expect(prismaMock.documentVersion.create).toHaveBeenCalledTimes(1)
    const parentIds = prismaMock.versionParent.createMany.mock.calls[0][0].data.map((d: { parentId: string }) => d.parentId)
    expect(parentIds).toContain('tgt-head')
    expect(parentIds).toContain('fork-1')
  })
})
