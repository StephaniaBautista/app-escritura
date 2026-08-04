import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storyOption: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { optionsService } from '../options-service.js'

const defaultOption = {
  id: 'opt-1',
  userId: null,
  type: 'rating',
  value: 'teen',
  label: 'Teen',
  isDefault: true,
  createdAt: new Date(),
}

const userOption = {
  id: 'opt-2',
  userId: 'user-1',
  type: 'rating',
  value: 'custom',
  label: 'Mi rating custom',
  isDefault: false,
  createdAt: new Date(),
}

describe('optionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list: devuelve defaults + opciones del usuario para un tipo', async () => {
    prismaMock.storyOption.findMany.mockResolvedValue([defaultOption, userOption])

    const result = await optionsService.list('rating', 'user-1')

    expect(prismaMock.storyOption.findMany).toHaveBeenCalledWith({
      where: { type: 'rating', OR: [{ userId: null }, { userId: 'user-1' }] },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
    expect(result).toHaveLength(2)
  })

  it('create: crea una opción custom del usuario', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue(userOption)

    const result = await optionsService.create('user-1', 'rating', 'custom', 'Mi rating custom')

    expect(prismaMock.storyOption.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', type: 'rating', value: 'custom', label: 'Mi rating custom', isDefault: false },
    })
    expect(result).toEqual(userOption)
  })

  it('create: devuelve existente si ya existe (no duplica)', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(userOption)

    const result = await optionsService.create('user-1', 'rating', 'custom', 'Mi rating custom')

    expect(prismaMock.storyOption.create).not.toHaveBeenCalled()
    expect(result).toEqual(userOption)
  })

  it('delete: elimina opción del usuario (no defaults)', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(userOption)
    prismaMock.storyOption.delete.mockResolvedValue(userOption)

    const result = await optionsService.delete('opt-2', 'user-1')

    expect(result).toBe(true)
    expect(prismaMock.storyOption.delete).toHaveBeenCalledWith({ where: { id: 'opt-2' } })
  })

  it('delete: no elimina defaults', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)

    const result = await optionsService.delete('opt-1', 'user-1')

    expect(result).toBe(false)
    expect(prismaMock.storyOption.delete).not.toHaveBeenCalled()
  })

  it('seedDefaults: crea defaults que no existen', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue(defaultOption)

    const created = await optionsService.seedDefaults()

    expect(created).toBeGreaterThan(0)
    expect(prismaMock.storyOption.create).toHaveBeenCalled()
  })

  it('seedDefaults: no duplica defaults existentes', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(defaultOption)

    const created = await optionsService.seedDefaults()

    expect(created).toBe(0)
    expect(prismaMock.storyOption.create).not.toHaveBeenCalled()
  })
})
