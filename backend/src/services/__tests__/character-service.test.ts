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

import { characterService, StoryPointError } from '../character-service.js'

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
  sheetBackgroundMode: 'default',
  sheetBackgroundImages: [],
  evolvesFromId: null,
  evolutionReason: null,
  storyPoint: null,
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
        sheetBackgroundMode: 'collage',
        sheetBackgroundImages: ['https://cdn.example.com/one.jpg'],
        attributes: { personality: 'Curiosa' },
      })

      expect(character).toEqual(characterRow)
      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Lyra',
          parentIds: ['char-2'],
          nicknames: [],
          sheetBackgroundMode: 'collage',
          sheetBackgroundImages: ['https://cdn.example.com/one.jpg'],
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

    it('guarda el modo y las imágenes de fondo saneadas', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.findMany.mockResolvedValue([])
      prismaMock.character.update.mockResolvedValue(characterRow)

      await characterService.update('char-1', 'user-1', {
        sheetBackgroundMode: 'single',
        sheetBackgroundImages: [
          'https://cdn.example.com/one.jpg',
          'http://insecure.example.com/two.jpg',
        ],
      })

      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: expect.objectContaining({
          sheetBackgroundMode: 'single',
          sheetBackgroundImages: ['https://cdn.example.com/one.jpg'],
        }),
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

    it('reparenta los hijos de evolución al abuelo al eliminar una evolución', async () => {
      prismaMock.character.findFirst.mockResolvedValue({ ...characterRow, evolvesFromId: 'char-0' })
      prismaMock.character.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'char-4' }])
      prismaMock.character.delete.mockResolvedValue(characterRow)

      const result = await characterService.delete('char-1', 'user-1')

      expect(result).toBe(true)
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-4' },
        data: { evolvesFromId: 'char-0' },
      })
    })
  })

  describe('setEvolutionReason', () => {
    it('actualiza el motivo de la evolución con ownership', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.update.mockResolvedValue({ ...characterRow, evolutionReason: 'Nuevo motivo' })

      const character = await characterService.setEvolutionReason('char-1', 'user-1', 'Nuevo motivo')

      expect(prismaMock.character.findFirst).toHaveBeenCalledWith({
        where: { id: 'char-1', project: { userId: 'user-1' } },
      })
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: { evolutionReason: 'Nuevo motivo' },
      })
      expect(character?.evolutionReason).toBe('Nuevo motivo')
    })

    it('permite limpiar el motivo con null', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.update.mockResolvedValue({ ...characterRow, evolutionReason: null })

      await characterService.setEvolutionReason('char-1', 'user-1', null)

      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: { evolutionReason: null },
      })
    })

    it('devuelve null si el personaje no pertenece al usuario', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null)

      const character = await characterService.setEvolutionReason('char-1', 'user-1', 'x')

      expect(character).toBeNull()
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

    it('con valores null explícitos no hereda del origen', async () => {
      prismaMock.character.findFirst.mockResolvedValue({ ...characterRow, description: 'La original', age: '30' })
      prismaMock.character.create.mockResolvedValue({ ...characterRow, id: 'char-3', name: 'Nueva', description: null, age: null })

      const evolved = await characterService.evolve('char-1', 'user-1', {
        reason: 'Hoja nueva',
        changes: { name: 'Nueva', description: null, age: null },
      })

      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Nueva', description: null, age: null }),
      })
      expect(evolved?.description).toBeNull()
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
          sheetBackgroundMode: 'default',
          sheetBackgroundImages: [],
        }),
      })
    })

    it('guarda el punto de la historia cuando es posterior al del origen', async () => {
      prismaMock.character.findFirst.mockResolvedValue({ ...characterRow, storyPoint: 'inicio' })
      prismaMock.character.create.mockResolvedValue({ ...characterRow, storyPoint: 'climax' })

      const evolved = await characterService.evolve('char-1', 'user-1', {
        reason: 'Cambia en el clímax',
        changes: { storyPoint: 'climax', name: 'Lyra la Dama' },
      })

      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ storyPoint: 'climax', evolvesFromId: 'char-1' }),
      })
      expect(evolved?.storyPoint).toBe('climax')
    })

    it('rechaza un punto igual o anterior al del origen', async () => {
      prismaMock.character.findFirst.mockResolvedValue({ ...characterRow, storyPoint: 'climax' })

      await expect(characterService.evolve('char-1', 'user-1', {
        reason: 'Mal punto',
        changes: { storyPoint: 'inicio' },
      })).rejects.toThrow(StoryPointError)
      await expect(characterService.evolve('char-1', 'user-1', {
        reason: 'Mismo punto',
        changes: { storyPoint: 'climax' },
      })).rejects.toThrow(StoryPointError)
    })

    it('no restringe el punto si el origen no tiene uno', async () => {
      prismaMock.character.findFirst.mockResolvedValue(characterRow)
      prismaMock.character.create.mockResolvedValue({ ...characterRow, storyPoint: 'final' })

      const evolved = await characterService.evolve('char-1', 'user-1', {
        reason: 'Sin punto previo',
        changes: { storyPoint: 'final' },
      })

      expect(prismaMock.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ storyPoint: 'final' }),
      })
      expect(evolved?.storyPoint).toBe('final')
    })

    it('devuelve null si el origen no pertenece al usuario', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null)

      const evolved = await characterService.evolve('char-1', 'user-1', { reason: 'x', changes: {} })

      expect(evolved).toBeNull()
    })
  })
})
