import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'
import { EMPTY_MAP_CANVAS, sanitizeMapCanvas, type MapCanvas } from '../lib/map-canvas.js'

export interface MapBoardInput {
  name?: string
  canvas?: unknown
}

export interface MapBoardRecord {
  id: string
  projectId: string
  name: string
  backgroundUrl: string | null
  canvas: MapCanvas
  order: number
  createdAt: Date
  updatedAt: Date
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

function parseCanvas(value: unknown): MapCanvas {
  const result = sanitizeMapCanvas(value)
  if ('error' in result) return EMPTY_MAP_CANVAS
  return result.canvas
}

function toRecord(row: {
  id: string
  projectId: string
  name: string
  backgroundUrl: string | null
  canvas: Prisma.JsonValue
  order: number
  createdAt: Date
  updatedAt: Date
}): MapBoardRecord {
  return {
    ...row,
    canvas: parseCanvas(row.canvas),
  }
}

export const mapService = {
  async list(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const rows = await prisma.mapBoard.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toRecord)
  },

  async get(id: string, userId: string) {
    const row = await prisma.mapBoard.findFirst({ where: { id, project: { userId } } })
    return row ? toRecord(row) : null
  },

  async create(projectId: string, userId: string, data: MapBoardInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const name = data.name?.trim()
    if (!name) return { error: 'NAME_REQUIRED' as const }
    const count = await prisma.mapBoard.count({ where: { projectId } })
    const row = await prisma.mapBoard.create({
      data: {
        projectId,
        name: name.slice(0, 120),
        canvas: EMPTY_MAP_CANVAS as unknown as Prisma.InputJsonValue,
        order: count,
      },
    })
    return toRecord(row)
  },

  async update(id: string, userId: string, data: MapBoardInput) {
    const existing = await prisma.mapBoard.findFirst({ where: { id, project: { userId } } })
    if (!existing) return null
    const patch: Prisma.MapBoardUpdateInput = {}
    if (data.name !== undefined) {
      const name = data.name.trim()
      if (!name) return { error: 'NAME_REQUIRED' as const }
      patch.name = name.slice(0, 120)
    }
    if (data.canvas !== undefined) {
      const sanitized = sanitizeMapCanvas(data.canvas)
      if ('error' in sanitized) return { error: sanitized.error }
      patch.canvas = sanitized.canvas as unknown as Prisma.InputJsonValue
    }
    const row = await prisma.mapBoard.update({ where: { id }, data: patch })
    return toRecord(row)
  },

  async attachBackground(id: string, userId: string, backgroundUrl: string) {
    const existing = await prisma.mapBoard.findFirst({ where: { id, project: { userId } } })
    if (!existing) return null
    const row = await prisma.mapBoard.update({ where: { id }, data: { backgroundUrl } })
    return toRecord(row)
  },

  async clearBackground(id: string, userId: string) {
    const existing = await prisma.mapBoard.findFirst({ where: { id, project: { userId } } })
    if (!existing) return null
    const row = await prisma.mapBoard.update({ where: { id }, data: { backgroundUrl: null } })
    return toRecord(row)
  },

  async remove(id: string, userId: string) {
    const existing = await prisma.mapBoard.findFirst({ where: { id, project: { userId } } })
    if (!existing) return null
    await prisma.mapBoard.delete({ where: { id } })
    return existing
  },
}
