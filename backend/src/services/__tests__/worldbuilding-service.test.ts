import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    loreEntry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    race: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    glossaryEntry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    creature: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    location: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    worldRoute: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { worldbuildingService } from '../worldbuilding-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }

describe('worldbuildingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('lore', () => {
    it('listLore verifica ownership y lista ordenado', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.loreEntry.findMany.mockResolvedValue([])

      const result = await worldbuildingService.listLore('proj-1', 'user-1')

      expect(prismaMock.loreEntry.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
      expect(result).toEqual([])
    })

    it('listLore devuelve null sin ownership', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      expect(await worldbuildingService.listLore('proj-1', 'user-1')).toBeNull()
      expect(prismaMock.loreEntry.findMany).not.toHaveBeenCalled()
    })

    it('createLore normaliza type inválido a custom y usa el contador como order', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.loreEntry.count.mockResolvedValue(3)
      prismaMock.loreEntry.create.mockResolvedValue({ id: 'lore-1' })

      await worldbuildingService.createLore('proj-1', 'user-1', { name: 'Magia', type: 'inexistente' })

      expect(prismaMock.loreEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Magia', type: 'custom', order: 3 }),
      })
    })
  })

  describe('race', () => {
    it('createRace usa hasMagic=false por defecto', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.race.create.mockResolvedValue({ id: 'race-1' })

      await worldbuildingService.createRace('proj-1', 'user-1', { name: 'Elfos' })

      expect(prismaMock.race.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Elfos', hasMagic: false }),
      })
    })
  })

  describe('routes', () => {
    it('createRoute normaliza el par A<B y crea', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.worldRoute.findUnique.mockResolvedValue(null)
      prismaMock.worldRoute.create.mockResolvedValue({ id: 'route-1', locationAId: 'a', locationBId: 'b' })

      const route = await worldbuildingService.createRoute('proj-1', 'user-1', {
        locationAId: 'b',
        locationBId: 'a',
      })

      expect(prismaMock.worldRoute.findUnique).toHaveBeenCalledWith({
        where: { locationAId_locationBId: { locationAId: 'a', locationBId: 'b' } },
      })
      expect(route).toEqual({ id: 'route-1', locationAId: 'a', locationBId: 'b' })
    })

    it('createRoute devuelve null si A === B', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)

      expect(await worldbuildingService.createRoute('proj-1', 'user-1', {
        locationAId: 'a',
        locationBId: 'a',
      })).toBeNull()
    })

    it('createRoute devuelve la ruta existente si ya existe', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.worldRoute.findUnique.mockResolvedValue({ id: 'route-existing' })

      const route = await worldbuildingService.createRoute('proj-1', 'user-1', {
        locationAId: 'a',
        locationBId: 'b',
      })

      expect(route).toEqual({ id: 'route-existing' })
      expect(prismaMock.worldRoute.create).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('removeLocation devuelve false si no existe', async () => {
      prismaMock.location.findFirst.mockResolvedValue(null)

      expect(await worldbuildingService.removeLocation('loc-1', 'user-1')).toBe(false)
      expect(prismaMock.location.delete).not.toHaveBeenCalled()
    })

    it('removeCreature borra y devuelve true', async () => {
      prismaMock.creature.findFirst.mockResolvedValue({ id: 'c-1' })
      prismaMock.creature.delete.mockResolvedValue({ id: 'c-1' })

      expect(await worldbuildingService.removeCreature('c-1', 'user-1')).toBe(true)
      expect(prismaMock.creature.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } })
    })
  })
})
