import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => {
  const character = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    prismaMock: {
      project: { findFirst: vi.fn() },
      character,
      $transaction: vi.fn(async (fn: (tx: { character: typeof character }) => unknown) => fn({ character })),
    },
  }
})

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { characterService } from '../character-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', description: null, userId: 'user-1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') }

const characterRow = {
  id: 'char-1',
  projectId: 'proj-1',
  name: 'Lyra',
  description: 'Protagonista',
  imageUrl: null,
  nicknames: ['Ly'],
  age: '17',
  gender: 'Femenino',
  heightCm: 165,
  orientation: null,
  maritalStatus: null,
  species: 'Humana',
  birthPlace: 'Oxford',
  birthDate: null,
  role: 'Principal',
  roleSpec: 'Protagonista',
  isOC: false,
  parentIds: ['char-2'],
  evolvesFromId: null,
  evolutionReason: null,
  attributes: { personality: 'Curiosa' },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('characterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listByProject', () => {
    it('verifica ownership del proyecto y devuelve personajes ordenados por nombre', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([characterRow])

      const characters = await characterService.listByProject('proj-1', 'user-1')

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({ where: { id: 'proj-1', userId: 'user-1' } })
      expect(prismaMock.character.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: { name: 'asc' },
      })
      expect(characters).toEqual([characterRow])
    })

    it('devuelve null si el proyecto no pertenece al usuario', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const characters = await characterService.listByProject('proj-1', 'user-1')

      expect(characters).toBeNull()
      expect(prismaMock.character.findMany).not.toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('incluye las evoluciones ordenadas', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)

      const character = await characterService.get('char-1', 'user-1')

      expect(prismaMock.character.findFirst).toHaveBeenCalledWith({
        where: { id: 'char-1', project: { userId: 'user-1' } },
        include: { evolutions: { orderBy: { createdAt: 'asc' } } },
      })
      expect(character).toEqual(characterRow)
    })
  })

  describe('create', () => {
    it('crea con defaults y parentIds saneados al proyecto', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-2' }])
      prismaMock.character.create.mockResolvedValue(characterRow)

      const character = await characterService.create('proj-1', 'user-1', {
        name: 'Lyra',
        parentIds: ['char-2', 'char-otro-proyecto'],
        attributes: { personality: 'Curiosa' },
      })

      expect(character).toEqual(characterRow)
      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Lyra',
          parentIds: ['char-2'],
          nicknames: [],
          attributes: { personality: 'Curiosa' },
          projectId: 'proj-1',
        }),
      })
    })

    it('devuelve null si el proyecto no pertenece al usuario', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const character = await characterService.create('proj-1', 'user-1', { name: 'Lyra' })

      expect(character).toBeNull()
    })
  })

  describe('update', () => {
    it('actualiza campos y excluye el propio id de parentIds', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }])
      prismaMock.character.update.mockResolvedValue(characterRow)

      await characterService.update('char-1', 'user-1', {
        name: 'Lyra Belacqua',
        parentIds: ['char-1', 'char-2'],
      })

      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: expect.objectContaining({ name: 'Lyra Belacqua', parentIds: ['char-2'] }),
      })
    })

    it('devuelve null si el personaje no pertenece al usuario', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null)

      const character = await characterService.update('char-1', 'user-1', { name: 'X' })

      expect(character).toBeNull()
    })
  })

  describe('delete', () => {
    it('borra el id de parentIds de los referenciadores y elimina el personaje', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.findMany.mockResolvedValue([
        { id: 'char-9', parentIds: ['char-1', 'char-2'] },
      ])
      prismaMock.character.delete.mockResolvedValue(characterRow)

      const result = await characterService.delete('char-1', 'user-1')

      expect(result).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-9' },
        data: { parentIds: ['char-2'] },
      })
      expect(prismaMock.character.delete).toHaveBeenCalledWith({ where: { id: 'char-1' } })
    })

    it('devuelve false si no existe', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null)

      const result = await characterService.delete('char-1', 'user-1')

      expect(result).toBe(false)
    })
  })

  describe('evolve', () => {
    it('crea una copia que hereda atributos y parentIds, con motivo y origen', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-2' }])
      prismaMock.character.create.mockResolvedValue({ ...characterRow, id: 'char-3' })

      const evolved = await characterService.evolve('char-1', 'user-1', {
        reason: 'Tras el segundo libro se vuelve reservada',
        changes: { name: 'Lyra la Dama', attributes: { personality: 'Reservada' } },
      })

      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Lyra la Dama',
          parentIds: ['char-2'],
          attributes: { personality: 'Reservada' },
          evolvesFromId: 'char-1',
          evolutionReason: 'Tras el segundo libro se vuelve reservada',
          projectId: 'proj-1',
        }),
      })
      expect(evolved).toEqual(expect.objectContaining({ id: 'char-3' }))
    })

    it('sin changes copia todo tal cual', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.create.mockResolvedValue(characterRow)

      await characterService.evolve('char-1', 'user-1', { reason: 'Envejece', changes: {} })

      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Lyra',
          attributes: { personality: 'Curiosa' },
          parentIds: ['char-2'],
          imageUrl: null,
        }),
      })
    })

    it('devuelve null si el origen no pertenece al usuario', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null)

      const evolved = await characterService.evolve('char-1', 'user-1', { reason: 'x', changes: {} })

      expect(evolved).toBeNull()
    })
  })
})
