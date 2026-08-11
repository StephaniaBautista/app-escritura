import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    timelineEvent: {
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
  characterIds: ['char-1'],
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
          characterIds: ['char-1'],
        },
      })
      expect(event).toEqual(eventRow)
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
})
