import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    mapBoard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { mapService } from '../map-service.js'
import { EMPTY_MAP_CANVAS } from '../../lib/map-canvas.js'

const projectRow = { id: 'proj-1', name: 'Novela', userId: 'user-1' }
const mapRow = {
  id: 'map-1',
  projectId: 'proj-1',
  name: 'Reino',
  backgroundUrl: null,
  canvas: EMPTY_MAP_CANVAS,
  order: 0,
  createdAt: new Date('2026-09-12'),
  updatedAt: new Date('2026-09-12'),
}

describe('mapService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list verifica ownership y ordena', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.mapBoard.findMany.mockResolvedValue([mapRow])

    const result = await mapService.list('proj-1', 'user-1')

    expect(prismaMock.mapBoard.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    expect(result?.[0].name).toBe('Reino')
  })

  it('list devuelve null sin ownership', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)
    expect(await mapService.list('proj-1', 'user-1')).toBeNull()
    expect(prismaMock.mapBoard.findMany).not.toHaveBeenCalled()
  })

  it('create usa el contador como order y un lienzo vacío', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.mapBoard.count.mockResolvedValue(2)
    prismaMock.mapBoard.create.mockResolvedValue({ ...mapRow, order: 2 })

    await mapService.create('proj-1', 'user-1', { name: 'Ciudad' })

    expect(prismaMock.mapBoard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'proj-1',
        name: 'Ciudad',
        order: 2,
        canvas: EMPTY_MAP_CANVAS,
      }),
    })
  })

  it('create rechaza nombre vacío', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    expect(await mapService.create('proj-1', 'user-1', { name: '   ' })).toEqual({ error: 'NAME_REQUIRED' })
    expect(prismaMock.mapBoard.create).not.toHaveBeenCalled()
  })

  it('update sanitiza el canvas y rechaza tipos extraños', async () => {
    prismaMock.mapBoard.findFirst.mockResolvedValue(mapRow)
    prismaMock.mapBoard.update.mockResolvedValue(mapRow)

    await mapService.update('map-1', 'user-1', {
      canvas: {
        objects: [
          { id: 'icon-ok01', type: 'icon', iconId: 'river', x: 1, y: 2, width: 40, height: 40, rotation: 0, stroke: '#2c2416' },
          { id: 'nope', type: 'script' },
        ],
      },
    })

    expect(prismaMock.mapBoard.update).toHaveBeenCalledWith({
      where: { id: 'map-1' },
      data: {
        canvas: {
          version: 1,
          objects: [
            { id: 'icon-ok01', type: 'icon', iconId: 'river', x: 1, y: 2, width: 40, height: 40, rotation: 0, stroke: '#2c2416' },
          ],
        },
      },
    })
  })

  it('remove solo borra si hay ownership', async () => {
    prismaMock.mapBoard.findFirst.mockResolvedValue(null)
    expect(await mapService.remove('map-1', 'user-1')).toBeNull()
    expect(prismaMock.mapBoard.delete).not.toHaveBeenCalled()
  })
})
