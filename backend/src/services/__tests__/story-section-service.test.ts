import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storySection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { storySectionService } from '../story-section-service.js'

const sections = [
  { id: 'inicio', sortOrder: 1, createdAt: new Date() },
  { id: 'desarrollo', sortOrder: 2, createdAt: new Date() },
  { id: 'climax', sortOrder: 3, createdAt: new Date() },
  { id: 'final', sortOrder: 4, createdAt: new Date() },
]

describe('storySectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storySectionService.invalidate()
  })

  it('list: devuelve las secciones ordenadas por sortOrder', async () => {
    prismaMock.storySection.findMany.mockResolvedValue(sections)

    const result = await storySectionService.list()

    expect(prismaMock.storySection.findMany).toHaveBeenCalledWith({ orderBy: [{ sortOrder: 'asc' }] })
    expect(result).toHaveLength(4)
  })

  it('list: usa cache tras la primera llamada', async () => {
    prismaMock.storySection.findMany.mockResolvedValue(sections)

    await storySectionService.list()
    await storySectionService.list()

    expect(prismaMock.storySection.findMany).toHaveBeenCalledTimes(1)
  })

  it('isStandard: true para ids sembrados, false para custom', async () => {
    prismaMock.storySection.findMany.mockResolvedValue(sections)

    expect(await storySectionService.isStandard('inicio')).toBe(true)
    expect(await storySectionService.isStandard('epilogo')).toBe(false)
  })

  it('seedDefaults: siembra las 4 secciones solo si faltan', async () => {
    prismaMock.storySection.findUnique.mockResolvedValue(null)
    prismaMock.storySection.create.mockResolvedValue(sections[0])

    const created = await storySectionService.seedDefaults()

    expect(created).toBe(4)
    expect(prismaMock.storySection.create).toHaveBeenCalledTimes(4)
  })

  it('seedDefaults: no duplica secciones existentes', async () => {
    prismaMock.storySection.findUnique.mockResolvedValue(sections[0])

    const created = await storySectionService.seedDefaults()

    expect(created).toBe(0)
    expect(prismaMock.storySection.create).not.toHaveBeenCalled()
  })
})
