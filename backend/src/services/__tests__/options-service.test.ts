import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storyOption: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
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
    optionsService.invalidate()
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

  it('list: filtra ships/characters por fandoms seleccionados (hasSome)', async () => {
    prismaMock.storyOption.findMany.mockResolvedValue([])

    await optionsService.list('ship', { fandoms: ['Harry Potter', 'Star Wars'] })

    expect(prismaMock.storyOption.findMany).toHaveBeenCalledWith({
      where: { type: 'ship', fandoms: { hasSome: ['Harry Potter', 'Star Wars'] } },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
  })

  it('list: sin fandoms seleccionados devuelve solo generales (isEmpty)', async () => {
    prismaMock.storyOption.findMany.mockResolvedValue([])

    await optionsService.list('character', { fandoms: [] })

    expect(prismaMock.storyOption.findMany).toHaveBeenCalledWith({
      where: { type: 'character', fandoms: { isEmpty: true } },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
  })

  it('create: persiste los fandoms asociados', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue({ ...customOption, fandoms: ['Harry Potter'] })

    await optionsService.create('ship', 'Dramione', 'Dramione', ['Harry Potter'])

    expect(prismaMock.storyOption.create).toHaveBeenCalledWith({
      data: { type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: ['Harry Potter'], isDefault: false },
    })
  })

  it('create: crea una opción global', async () => {
    prismaMock.storyOption.findFirst.mockResolvedValue(null)
    prismaMock.storyOption.create.mockResolvedValue(customOption)

    const result = await optionsService.create('fandom', 'Harry Potter', 'Harry Potter')

    expect(prismaMock.storyOption.findFirst).toHaveBeenCalledWith({
      where: { type: 'fandom', value: { equals: 'Harry Potter', mode: 'insensitive' } },
    })
    expect(prismaMock.storyOption.create).toHaveBeenCalledWith({
      data: { type: 'fandom', value: 'Harry Potter', label: 'Harry Potter', fandoms: [], isDefault: false },
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

  describe('listByFandom', () => {
    it('agrupa hijos por fandom y cuenta por tipo; descarta los sin fandom y las etiquetas', async () => {
      prismaMock.storyOption.findMany
        .mockResolvedValueOnce([
          { ...customOption, id: 'f1', value: 'Harry Potter', label: 'Harry Potter' },
          { ...customOption, id: 'f2', value: 'Star Wars', label: 'Star Wars' },
        ])
        .mockResolvedValueOnce([
          { id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: ['Harry Potter'], isDefault: false, createdAt: new Date() },
          { id: 'c1', type: 'character', value: 'Hermione', label: 'Hermione', fandoms: ['Harry Potter'], isDefault: false, createdAt: new Date() },
          { id: 't1', type: 'tag', value: 'Angst', label: 'Angst', fandoms: ['Star Wars'], isDefault: false, createdAt: new Date() },
          { id: 'o1', type: 'character', value: 'OC', label: 'OC', fandoms: [], isDefault: false, createdAt: new Date() },
        ])

      const tree = await optionsService.listByFandom()

      expect(tree.fandoms).toHaveLength(2)
      const hp = tree.fandoms.find((f) => f.value === 'Harry Potter')
      expect(hp?.counts).toEqual({ ship: 1, character: 1 })
      expect(tree.children['Harry Potter'].ship).toHaveLength(1)
      expect(tree.children['Harry Potter'].character).toHaveLength(1)
      expect(tree.children['Star Wars'].ship).toHaveLength(0)
      expect(tree.children['Star Wars'].character).toHaveLength(0)
    })

    it('no incluye opciones sin fandom en el mapa de hijos', async () => {
      prismaMock.storyOption.findMany
        .mockResolvedValueOnce([{ ...customOption, id: 'f1', value: 'Harry Potter', label: 'Harry Potter' }])
        .mockResolvedValueOnce([
          { id: 'o1', type: 'character', value: 'OC', label: 'OC', fandoms: [], isDefault: false, createdAt: new Date() },
        ])

      const tree = await optionsService.listByFandom()

      expect(tree.children['Harry Potter'].character).toHaveLength(0)
    })
  })

  describe('moveFandom', () => {
    it('reemplaza el array de fandoms por el destino', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue({
        id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: ['Harry Potter'], isDefault: false, createdAt: new Date(),
      })
      prismaMock.storyOption.findFirst.mockResolvedValue({ ...customOption, id: 'f2', value: 'Star Wars', label: 'Star Wars' })
      prismaMock.storyOption.update.mockResolvedValue({})

      const result = await optionsService.moveFandom('s1', 'Star Wars')

      expect(result).toEqual({ ok: true })
      expect(prismaMock.storyOption.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { fandoms: ['Star Wars'] },
      })
    })

    it('rechaza mover una opción default', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue({ ...globalOption, fandoms: [] })

      const result = await optionsService.moveFandom('opt-1', 'Star Wars')

      expect(result).toEqual({ ok: false, reason: 'is-default' })
      expect(prismaMock.storyOption.update).not.toHaveBeenCalled()
    })

    it('rechaza mover una opción que no existe', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue(null)

      const result = await optionsService.moveFandom('nope', 'Star Wars')

      expect(result).toEqual({ ok: false, reason: 'not-found' })
    })

    it('rechaza mover un fandom a otro fandom (invalid-type)', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue({
        ...customOption, id: 'f1', value: 'Harry Potter', label: 'Harry Potter', fandoms: [], isDefault: false,
      })

      const result = await optionsService.moveFandom('f1', 'Star Wars')

      expect(result).toEqual({ ok: false, reason: 'invalid-type' })
    })

    it('rechaza mover una etiqueta (las etiquetas son globales, invalid-type)', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue({
        id: 't1', type: 'tag', value: 'Angst', label: 'Angst', fandoms: ['Harry Potter'], isDefault: false, createdAt: new Date(),
      })

      const result = await optionsService.moveFandom('t1', 'Star Wars')

      expect(result).toEqual({ ok: false, reason: 'invalid-type' })
      expect(prismaMock.storyOption.update).not.toHaveBeenCalled()
    })

    it('rechaza mover a un fandom inexistente', async () => {
      prismaMock.storyOption.findUnique.mockResolvedValue({
        id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: [], isDefault: false, createdAt: new Date(),
      })
      prismaMock.storyOption.findFirst.mockResolvedValue(null)

      const result = await optionsService.moveFandom('s1', 'Nope')

      expect(result).toEqual({ ok: false, reason: 'invalid-fandom' })
    })
  })

  describe('hasFandomChildren', () => {
    it('devuelve true si algún hijo referencia el fandom', async () => {
      prismaMock.storyOption.findFirst.mockResolvedValue({ id: 's1' })

      const result = await optionsService.hasFandomChildren('Harry Potter')

      expect(result).toBe(true)
      expect(prismaMock.storyOption.findFirst).toHaveBeenCalledWith({
        where: { type: { in: ['ship', 'character'] }, fandoms: { has: 'Harry Potter' } },
      })
    })

    it('devuelve false si no hay hijos', async () => {
      prismaMock.storyOption.findFirst.mockResolvedValue(null)

      const result = await optionsService.hasFandomChildren('Harry Potter')

      expect(result).toBe(false)
    })
  })

  describe('cache', () => {
    it('list: cachea por tipo y no vuelve a consultar prisma', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([globalOption])

      const first = await optionsService.list('fandom')
      const second = await optionsService.list('fandom')

      expect(first).toHaveLength(1)
      expect(second).toHaveLength(1)
      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(1)
    })

    it('list: el cache distingue el filtro de fandoms', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([])

      await optionsService.list('ship', { fandoms: ['Harry Potter'] })
      await optionsService.list('ship', { fandoms: ['Star Wars'] })

      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(2)
    })

    it('create: invalida el cache tras crear', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([])
      await optionsService.list('fandom')

      prismaMock.storyOption.findFirst.mockResolvedValue(null)
      prismaMock.storyOption.create.mockResolvedValue(customOption)
      await optionsService.create('fandom', 'Harry Potter', 'Harry Potter')

      prismaMock.storyOption.findMany.mockResolvedValue([customOption])
      const after = await optionsService.list('fandom')

      expect(after).toHaveLength(1)
      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(2)
    })

    it('delete: invalida el cache tras eliminar', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([customOption])
      await optionsService.list('fandom')

      prismaMock.storyOption.findFirst.mockResolvedValue(customOption)
      prismaMock.storyOption.delete.mockResolvedValue(customOption)
      await optionsService.delete('opt-2')

      prismaMock.storyOption.findMany.mockResolvedValue([])
      const after = await optionsService.list('fandom')

      expect(after).toHaveLength(0)
      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(2)
    })

    it('moveFandom: invalida el cache tras mover', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([])
      await optionsService.listByFandom()

      prismaMock.storyOption.findUnique.mockResolvedValue({
        id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: ['Harry Potter'], isDefault: false, createdAt: new Date(),
      })
      prismaMock.storyOption.findFirst.mockResolvedValue({ ...customOption, id: 'f2', value: 'Star Wars', label: 'Star Wars' })
      prismaMock.storyOption.update.mockResolvedValue({})
      await optionsService.moveFandom('s1', 'Star Wars')

      const before = prismaMock.storyOption.findMany.mock.calls.length
      await optionsService.listByFandom()
      expect(prismaMock.storyOption.findMany.mock.calls.length).toBeGreaterThan(before)
    })

    it('listByFandom: cachea el árbol', async () => {
      prismaMock.storyOption.findMany
        .mockResolvedValueOnce([{ ...customOption, id: 'f1', value: 'Harry Potter', label: 'Harry Potter' }])
        .mockResolvedValueOnce([])

      await optionsService.listByFandom()
      await optionsService.listByFandom()

      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(2)
    })

    it('groups: cachea por tipo', async () => {
      prismaMock.storyOption.findMany.mockResolvedValue([
        { ...customOption, id: 'a1', value: 'Harry Potter' },
      ])

      await optionsService.groups('fandom')
      await optionsService.groups('fandom')

      expect(prismaMock.storyOption.findMany).toHaveBeenCalledTimes(1)
    })
  })
})
