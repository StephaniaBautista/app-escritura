import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    timelineEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    timelineEra: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    character: { findMany: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { timelineService } from '../timeline-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }

const eventRow = {
  id: 'ev-1',
  projectId: 'proj-1',
  title: 'La caída de la torre',
  date: 'Año 3',
  description: null,
  order: 0,
  eraId: null,
  characterIds: ['char-1'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const eraRow = {
  id: 'era-1',
  projectId: 'proj-1',
  name: 'La Tercera Edad',
  color: null,
  precision: 'year',
  startDate: null,
  endDate: null,
  rollover: 'newYear',
  order: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('timelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listByProject', () => {
    it('verifica ownership y devuelve eventos ordenados por order', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.timelineEvent.findMany.mockResolvedValue([eventRow])

      const events = await timelineService.listByProject('proj-1', 'user-1')

      expect(prismaMock.timelineEvent.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
      expect(events).toEqual([eventRow])
    })

    it('devuelve null si el proyecto no pertenece al usuario', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const events = await timelineService.listByProject('proj-1', 'user-1')

      expect(events).toBeNull()
      expect(prismaMock.timelineEvent.findMany).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('sanea characterIds al proyecto y usa el contador como order por defecto', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }])
      prismaMock.timelineEvent.count.mockResolvedValue(2)
      prismaMock.timelineEvent.create.mockResolvedValue(eventRow)

      const event = await timelineService.create('proj-1', 'user-1', {
        title: 'La caída de la torre',
        date: 'Año 3',
        characterIds: ['char-1', 'char-inexistente'],
      })

      expect(prismaMock.character.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', id: { in: ['char-1', 'char-inexistente'] } },
        select: { id: true },
      })
      expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          title: 'La caída de la torre',
          date: 'Año 3',
          description: null,
          order: 2,
          eraId: null,
          characterIds: ['char-1'],
        },
      })
      expect(event).toEqual(eventRow)
    })

    it('asigna eraId solo si la época pertenece al proyecto', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.timelineEra.findFirst.mockResolvedValue(null)
      prismaMock.timelineEvent.count.mockResolvedValue(0)
      prismaMock.timelineEvent.create.mockResolvedValue(eventRow)

      await timelineService.create('proj-1', 'user-1', { title: 'X', eraId: 'era-ajena' })

      expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ eraId: null }) }),
      )
    })

    it('devuelve null sin ownership', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const event = await timelineService.create('proj-1', 'user-1', { title: 'X' })

      expect(event).toBeNull()
      expect(prismaMock.timelineEvent.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('actualiza solo si el evento es del usuario', async () => {
      prismaMock.timelineEvent.findFirst.mockResolvedValue(eventRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }])
      prismaMock.timelineEvent.update.mockResolvedValue({ ...eventRow, title: 'Nuevo título' })

      const event = await timelineService.update('ev-1', 'user-1', { title: 'Nuevo título' })

      expect(event?.title).toBe('Nuevo título')
      expect(prismaMock.timelineEvent.update).toHaveBeenCalledWith({
        where: { id: 'ev-1' },
        data: expect.objectContaining({ title: 'Nuevo título' }),
      })
    })

    it('devuelve null si no existe o no pertenece', async () => {
      prismaMock.timelineEvent.findFirst.mockResolvedValue(null)

      const event = await timelineService.update('ev-1', 'user-1', { title: 'X' })

      expect(event).toBeNull()
      expect(prismaMock.timelineEvent.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('borra y devuelve true', async () => {
      prismaMock.timelineEvent.findFirst.mockResolvedValue(eventRow)
      prismaMock.timelineEvent.delete.mockResolvedValue(eventRow)

      const removed = await timelineService.remove('ev-1', 'user-1')

      expect(removed).toBe(true)
      expect(prismaMock.timelineEvent.delete).toHaveBeenCalledWith({ where: { id: 'ev-1' } })
    })

    it('devuelve false si no existe', async () => {
      prismaMock.timelineEvent.findFirst.mockResolvedValue(null)

      const removed = await timelineService.remove('ev-1', 'user-1')

      expect(removed).toBe(false)
      expect(prismaMock.timelineEvent.delete).not.toHaveBeenCalled()
    })
  })

  describe('eras', () => {
    it('listEras verifica ownership y ordena', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.timelineEra.findMany.mockResolvedValue([eraRow])

      const eras = await timelineService.listEras('proj-1', 'user-1')

      expect(prismaMock.timelineEra.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
      expect(eras).toEqual([eraRow])
    })

    it('createEra usa el contador como order y aplica defaults', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.timelineEra.count.mockResolvedValue(3)
      prismaMock.timelineEra.create.mockResolvedValue({ ...eraRow, order: 3 })

      await timelineService.createEra('proj-1', 'user-1', { name: 'La Tercera Edad' })

      expect(prismaMock.timelineEra.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          name: 'La Tercera Edad',
          color: null,
          precision: 'year',
          startDate: null,
          endDate: null,
          rollover: 'newYear',
          order: 3,
        },
      })
    })

    it('createEra guarda color, precisión, rango y rollover', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.timelineEra.count.mockResolvedValue(0)
      prismaMock.timelineEra.create.mockResolvedValue(eraRow)

      await timelineService.createEra('proj-1', 'user-1', {
        name: 'La Tercera Edad',
        color: '#2d6b6b',
        precision: 'month',
        startDate: '-90 años',
        endDate: '-84 años',
        rollover: 'afterYear',
      })

      expect(prismaMock.timelineEra.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          name: 'La Tercera Edad',
          color: '#2d6b6b',
          precision: 'month',
          startDate: '-90 años',
          endDate: '-84 años',
          rollover: 'afterYear',
          order: 0,
        },
      })
    })

    it('updateEra renombra solo si es del usuario', async () => {
      prismaMock.timelineEra.findFirst.mockResolvedValue(eraRow)
      prismaMock.timelineEra.update.mockResolvedValue({ ...eraRow, name: 'Nuevo' })

      const era = await timelineService.updateEra('era-1', 'user-1', 'Nuevo')

      expect(era?.name).toBe('Nuevo')
      expect(prismaMock.timelineEra.update).toHaveBeenCalledWith({
        where: { id: 'era-1' },
        data: { name: 'Nuevo' },
      })
    })

    it('removeEra desasigna eventos y borra la época', async () => {
      prismaMock.timelineEra.findFirst.mockResolvedValue(eraRow)
      prismaMock.timelineEra.delete.mockResolvedValue(eraRow)

      const removed = await timelineService.removeEra('era-1', 'user-1')

      expect(prismaMock.timelineEvent.updateMany).toHaveBeenCalledWith({
        where: { eraId: 'era-1' },
        data: { eraId: null },
      })
      expect(prismaMock.timelineEra.delete).toHaveBeenCalledWith({ where: { id: 'era-1' } })
      expect(removed).toBe(true)
    })

    it('removeEra devuelve false si no es del usuario', async () => {
      prismaMock.timelineEra.findFirst.mockResolvedValue(null)

      const removed = await timelineService.removeEra('era-1', 'user-1')

      expect(removed).toBe(false)
      expect(prismaMock.timelineEra.delete).not.toHaveBeenCalled()
    })
  })
})
