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

import { optionsService, optionSimilarity, levenshteinDistance, normalizeOptionValue, SIMILARITY_THRESHOLD } from '../options-service.js'

const globalOption = {
  id: 'opt-1',
  type: 'rating',
  value: 'teen',
  label: 'Teen',
  isDefault: true,
  createdAt: new Date(),
}

const customOption = {
  id: 'opt-2',
  type: 'fandom',
  value: 'Harry Potter',
  label: 'Harry Potter',
  isDefault: false,
  createdAt: new Date(),
}

describe('optionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list: devuelve todas las opciones globales de un tipo', async () => {
    prismaMock.storyOption.findMany.mockResolvedValue([globalOption, customOption])

    const result = await optionsService.list('fandom')

    expect(prismaMock.storyOption.findMany).toHaveBeenCalledWith({
      where: { type: 'fandom' },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
    expect(result).toHaveLength(2)
  })

  it('create: crea una opción global', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue(customOption)

    const result = await optionsService.create('fandom', 'Harry Potter', 'Harry Potter')

    expect(prismaMock.storyOption.findFirst).toHaveBeenCalledWith({
      where: { type: 'fandom', value: { equals: 'Harry Potter', mode: 'insensitive' } },
    })
    expect(prismaMock.storyOption.create).toHaveBeenCalledWith({
      data: { type: 'fandom', value: 'Harry Potter', label: 'Harry Potter', isDefault: false },
    })
    expect(result).toEqual(customOption)
  })

  it('create: devuelve existente si ya existe (dedupe case-insensitive)', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(customOption)

    const result = await optionsService.create('fandom', 'harry potter', 'harry potter')

    expect(prismaMock.storyOption.create).not.toHaveBeenCalled()
    expect(result).toEqual(customOption)
  })

  it('delete: elimina una opción global (no defaults)', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(customOption)
    prismaMock.storyOption.delete.mockResolvedValue(customOption)

    const result = await optionsService.delete('opt-2')

    expect(result).toBe(true)
    expect(prismaMock.storyOption.delete).toHaveBeenCalledWith({ where: { id: 'opt-2' } })
  })

  it('delete: no elimina defaults', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)

    const result = await optionsService.delete('opt-1')

    expect(result).toBe(false)
    expect(prismaMock.storyOption.delete).not.toHaveBeenCalled()
  })

  it('seedDefaults: crea defaults que no existen', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue(globalOption)

    const created = await optionsService.seedDefaults()

    expect(created).toBeGreaterThan(0)
    expect(prismaMock.storyOption.create).toHaveBeenCalled()
  })

  it('seedDefaults: no duplica defaults existentes', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(globalOption)

    const created = await optionsService.seedDefaults()

    expect(created).toBe(0)
    expect(prismaMock.storyOption.create).not.toHaveBeenCalled()
  })

  describe('similitud', () => {
    it('normalize: minúsculas, trim y espacios colapsados', () => {
      expect(normalizeOptionValue('  Harry   Potter ')).toBe('harry potter')
    })

    it('levenshtein: distancia básica', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
      expect(levenshteinDistance('harry', 'harry')).toBe(0)
    })

    it('optionSimilarity: mismo valor normalizado = 1', () => {
      expect(optionSimilarity('Harry Potter', 'harry potter')).toBe(1)
    })

    it('optionSimilarity: typos leves superan el umbral', () => {
      expect(optionSimilarity('Harry Potter', 'Hary Potter')).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD)
    })

    it('optionSimilarity: textos distintos quedan bajo el umbral', () => {
      expect(optionSimilarity('Harry Potter', 'Star Wars')).toBeLessThan(SIMILARITY_THRESHOLD)
    })
  })

  describe('groups', () => {
    it('agrupa opciones similares en grupos separados', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([
        { ...customOption, id: 'a1', value: 'Harry Potter' },
        { ...customOption, id: 'a2', value: 'harry potter' },
        { ...customOption, id: 'a3', value: 'Star Wars' },
      ])

      const groups = await optionsService.groups('fandom')

      expect(groups).toHaveLength(2)
      const hpGroup = groups.find((g) => g.some((o) => o.id === 'a1'))
      expect(hpGroup?.map((o) => o.id).sort()).toEqual(['a1', 'a2'])
      expect(groups.find((g) => g.some((o) => o.id === 'a3'))).toHaveLength(1)
    })
  })
})
