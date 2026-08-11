import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    characterOption: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { characterOptionService, CHARACTER_OPTION_TYPES } from '../character-option-service.js'

const gender = {
  id: 'co-1',
  type: 'gender',
  value: 'Femenino',
  label: 'Femenino',
  labelEn: 'Female',
  sortOrder: 1,
  isDefault: true,
  createdAt: new Date(),
}

const role = {
  id: 'co-2',
  type: 'role',
  value: 'Principal',
  label: 'Principal',
  labelEn: 'Main',
  sortOrder: 1,
  isDefault: true,
  createdAt: new Date(),
}

describe('characterOptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    characterOptionService.invalidate()
  })

  it('listByType: filtra por tipo y ordena por sortOrder/label', async () => {
    prismaMock.characterOption.findMany.mockResolvedValue([gender])

    const result = await characterOptionService.listByType('gender')

    expect(prismaMock.characterOption.findMany).toHaveBeenCalledWith({
      where: { type: 'gender' },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    expect(result).toHaveLength(1)
  })

  it('listByType: usa cache tras la primera llamada', async () => {
    prismaMock.characterOption.findMany.mockResolvedValue([gender])

    await characterOptionService.listByType('gender')
    await characterOptionService.listByType('gender')

    expect(prismaMock.characterOption.findMany).toHaveBeenCalledTimes(1)
  })

  it('listGrouped: agrupa por los 4 tipos en orden', async () => {
    prismaMock.characterOption.findMany.mockResolvedValue([role, gender])

    const grouped = await characterOptionService.listGrouped()

    expect(grouped.map((g) => g.type)).toEqual(CHARACTER_OPTION_TYPES)
    expect(grouped.find((g) => g.type === 'gender')?.options).toHaveLength(1)
    expect(grouped.find((g) => g.type === 'role')?.options).toHaveLength(1)
    expect(grouped.find((g) => g.type === 'orientation')?.options).toHaveLength(0)
  })

  it('seedDefaults: siembra 17 opciones solo si no existen', async () => {
    prismaMock.characterOption.findFirst.mockResolvedValue(null)
    prismaMock.characterOption.create.mockResolvedValue(gender)

    const created = await characterOptionService.seedDefaults()

    expect(created).toBe(17)
    expect(prismaMock.characterOption.create).toHaveBeenCalledTimes(17)
    expect(prismaMock.characterOption.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) }),
    )
  })

  it('seedDefaults: no siembra opciones ya existentes', async () => {
    prismaMock.characterOption.findFirst.mockResolvedValue(gender)

    const created = await characterOptionService.seedDefaults()

    expect(created).toBe(0)
    expect(prismaMock.characterOption.create).not.toHaveBeenCalled()
  })
})
