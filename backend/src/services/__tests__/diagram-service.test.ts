import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    diagram: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    character: { findMany: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { diagramService, emptyLayout } from '../diagram-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }

const diagramRow = {
  id: 'diag-1',
  projectId: 'proj-1',
  name: 'Árbol genealógico',
  type: 'familyTree',
  data: {},
  layout: { nodes: [], notes: [] },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('diagramService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('crea diagrama custom con layout provisto', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.diagram.create.mockResolvedValue(diagramRow)

      const diagram = await diagramService.create('proj-1', 'user-1', {
        name: 'Mi pizarra',
        layout: { nodes: [{ id: 'char-1', position: { x: 10, y: 20 } }] },
      })

      expect(prismaMock.diagram.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'proj-1',
          name: 'Mi pizarra',
          type: 'custom',
          layout: expect.objectContaining({
            nodes: [{ id: 'char-1', position: { x: 10, y: 20 } }],
            notes: [],
          }),
        }),
      })
      expect(diagram).toEqual(diagramRow)
    })

    it('devuelve null sin ownership', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const diagram = await diagramService.create('proj-1', 'user-1', { name: 'X' })

      expect(diagram).toBeNull()
      expect(prismaMock.diagram.create).not.toHaveBeenCalled()
    })
  })

  describe('generate (familyTree)', () => {
    it('genera layout por generaciones: raices arriba, hijos por debajo', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([
        { id: 'abuelo', name: 'A', imageUrl: null, parentIds: [] },
        { id: 'padre', name: 'P', imageUrl: null, parentIds: ['abuelo'] },
        { id: 'hija', name: 'H', imageUrl: null, parentIds: ['padre'] },
        { id: 'hijo', name: 'S', imageUrl: null, parentIds: ['padre'] },
      ])
      prismaMock.diagram.create.mockImplementation(async ({ data }: { data: { layout: { nodes: { id: string; position: { x: number; y: number } }[] } } }) => ({
        ...diagramRow,
        type: 'familyTree',
        layout: data.layout,
      }))

      const diagram = await diagramService.generateFamilyTree('proj-1', 'user-1')

      const nodes = diagram?.layout as { nodes: { id: string; position: { x: number; y: number } }[] }
      const pos = new Map(nodes.nodes.map((n) => [n.id, n.position]))
      expect(pos.get('abuelo')?.y).toBe(0)
      expect(pos.get('padre')?.y).toBeGreaterThan(pos.get('abuelo')?.y ?? -1)
      expect(pos.get('hija')?.y).toBe(pos.get('hijo')?.y)
      expect(pos.get('hija')?.y).toBeGreaterThan(pos.get('padre')?.y ?? -1)
      expect(pos.get('hija')?.x).toBeLessThan(pos.get('hijo')?.x ?? Infinity)
    })

    it('centra un hijo entre sus dos progenitores', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([
        { id: 'tio', name: 'T', imageUrl: null, parentIds: [] },
        { id: 'tia', name: 'T2', imageUrl: null, parentIds: [] },
        { id: 'madre', name: 'M', imageUrl: null, parentIds: [] },
        { id: 'padre', name: 'P', imageUrl: null, parentIds: [] },
        { id: 'hija', name: 'H', imageUrl: null, parentIds: ['madre', 'padre'] },
      ])
      prismaMock.diagram.create.mockImplementation(async ({ data }: { data: { layout: { nodes: { id: string; position: { x: number; y: number } }[] } } }) => ({
        ...diagramRow,
        type: 'familyTree',
        layout: data.layout,
      }))

      const diagram = await diagramService.generateFamilyTree('proj-1', 'user-1')

      const nodes = diagram?.layout as { nodes: { id: string; position: { x: number; y: number } }[] }
      const pos = new Map(nodes.nodes.map((n) => [n.id, n.position]))
      const parentX = [pos.get('madre')?.x ?? 0, pos.get('padre')?.x ?? 0].sort((a, b) => a - b)
      const childX = pos.get('hija')?.x ?? 0
      expect(pos.get('madre')?.y).toBe(0)
      expect(pos.get('padre')?.y).toBe(0)
      expect(pos.get('hija')?.y).toBeGreaterThan(0)
      expect(childX).toBeGreaterThan(parentX[0])
      expect(childX).toBeLessThan(parentX[1])
    })

    it('genera relaciones en círculo con todos los personajes', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([
        { id: 'c1', name: 'A', imageUrl: null, parentIds: [] },
        { id: 'c2', name: 'B', imageUrl: null, parentIds: [] },
        { id: 'c3', name: 'C', imageUrl: null, parentIds: [] },
      ])
      prismaMock.diagram.create.mockImplementation(async ({ data }: { data: { layout: unknown } }) => ({
        ...diagramRow,
        type: 'relationships',
        layout: data.layout,
      }))

      const diagram = await diagramService.generateRelationships('proj-1', 'user-1')

      const nodes = diagram?.layout as { nodes: { id: string }[] }
      expect(nodes.nodes).toHaveLength(3)
      expect(nodes.nodes.map((n) => n.id).sort()).toEqual(['c1', 'c2', 'c3'])
    })
  })

  describe('update', () => {
    it('guarda layout manteniendo notas existentes si no se envían', async () => {
      prismaMock.diagram.findFirst.mockResolvedValue({
        ...diagramRow,
        layout: { nodes: [{ id: 'c1', position: { x: 1, y: 2 } }], notes: [{ id: 'n1', position: { x: 0, y: 0 }, text: 'idea' }] },
      })
      prismaMock.diagram.update.mockImplementation(async ({ data }: { data: { layout: { nodes: unknown; notes: unknown } } }) => ({
        ...diagramRow,
        layout: data.layout,
      }))

      const diagram = await diagramService.update('diag-1', 'user-1', {
        layout: { nodes: [{ id: 'c2', position: { x: 9, y: 9 } }] },
      })

      const layout = diagram?.layout as { nodes: { id: string }[]; notes: { id: string }[] }
      expect(layout.nodes).toEqual([{ id: 'c2', position: { x: 9, y: 9 } }])
      expect(layout.notes).toHaveLength(1)
    })

    it('devuelve null si no existe', async () => {
      prismaMock.diagram.findFirst.mockResolvedValue(null)

      const diagram = await diagramService.update('diag-1', 'user-1', { name: 'X' })

      expect(diagram).toBeNull()
    })
  })

  describe('remove', () => {
    it('borra y devuelve true; false si no existe', async () => {
      prismaMock.diagram.findFirst.mockResolvedValue(diagramRow)
      prismaMock.diagram.delete.mockResolvedValue(diagramRow)

      const removed = await diagramService.remove('diag-1', 'user-1')

      expect(removed).toBe(true)

      prismaMock.diagram.findFirst.mockResolvedValue(null)
      expect(await diagramService.remove('diag-1', 'user-1')).toBe(false)
    })
  })

  it('emptyLayout devuelve layout vacío', () => {
    expect(emptyLayout()).toEqual({ nodes: [], notes: [] })
  })
})
