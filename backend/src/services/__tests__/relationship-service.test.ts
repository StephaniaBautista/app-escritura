import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    characterRelationship: {
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

import {
  relationshipService,
  RelationshipExistsError,
  RelationshipNotFoundError,
  normalizeType,
  normalizePair,
  normalizeLineColor,
  normalizeLineStyle,
} from '../relationship-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }

const relRow = {
  id: 'rel-1',
  projectId: 'proj-1',
  characterAId: 'char-1',
  characterBId: 'char-2',
  type: 'romance',
  label: null,
  description: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const include = {
  characterA: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
  characterB: { select: { id: true, name: true, imageUrl: true, heightCm: true } },
}

describe('relationshipService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('helpers', () => {
    it('normalizePair ordena A < B', () => {
      expect(normalizePair('z', 'a')).toEqual({ characterAId: 'a', characterBId: 'z' })
      expect(normalizePair('a', 'z')).toEqual({ characterAId: 'a', characterBId: 'z' })
    })

    it('normalizeType cae a custom para tipos desconocidos', () => {
      expect(normalizeType('romance')).toBe('romance')
      expect(normalizeType('rivales')).toBe('custom')
      expect(normalizeType(undefined)).toBe('custom')
    })

    it('normalizeLineColor valida hex de 6 digitos', () => {
      expect(normalizeLineColor('#22c55e')).toBe('#22c55e')
      expect(normalizeLineColor('rojo')).toBeNull()
      expect(normalizeLineColor('#abc')).toBeNull()
      expect(normalizeLineColor(null)).toBeNull()
      expect(normalizeLineColor(undefined)).toBeNull()
    })

    it('normalizeLineStyle acepta solid, dashed y dotted; invalido a null', () => {
      expect(normalizeLineStyle('solid')).toBe('solid')
      expect(normalizeLineStyle('dashed')).toBe('dashed')
      expect(normalizeLineStyle('dotted')).toBe('dotted')
      expect(normalizeLineStyle('wavy')).toBeNull()
      expect(normalizeLineStyle(undefined)).toBeNull()
    })
  })

  describe('listByProject', () => {
    it('filtra por tipo opcional y devuelve null sin ownership', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.characterRelationship.findMany.mockResolvedValue([relRow])

      const rels = await relationshipService.listByProject('proj-1', 'user-1', 'romance')

      expect(prismaMock.characterRelationship.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', type: 'romance' },
        orderBy: { createdAt: 'asc' },
        include,
      })
      expect(rels).toEqual([relRow])

      prismaMock.project.findFirst.mockResolvedValue(null)
      const noRels = await relationshipService.listByProject('proj-1', 'user-1')
      expect(noRels).toBeNull()
    })
  })

  describe('create', () => {
    it('normaliza el par, sanea personajes y crea', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-2' }, { id: 'char-1' }])
      prismaMock.characterRelationship.findFirst.mockResolvedValue(null)
      prismaMock.characterRelationship.create.mockResolvedValue(relRow)

      const rel = await relationshipService.create('proj-1', 'user-1', {
        characterAId: 'char-2',
        characterBId: 'char-1',
        type: 'romance',
      })

      expect(prismaMock.characterRelationship.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          characterAId: 'char-1',
          characterBId: 'char-2',
          type: 'romance',
          label: null,
          description: null,
          lineColor: null,
          lineStyle: null,
        },
        include,
      })
      expect(rel).toEqual(relRow)
    })

    it('persiste lineColor y lineStyle y descarta valores invalidos', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }])
      prismaMock.characterRelationship.findFirst.mockResolvedValue(null)
      prismaMock.characterRelationship.create.mockResolvedValue(relRow)

      const rel = await relationshipService.create('proj-1', 'user-1', {
        characterAId: 'char-1',
        characterBId: 'char-2',
        type: 'custom',
        lineColor: '#22c55e',
        lineStyle: 'dashed',
      })

      expect(prismaMock.characterRelationship.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lineColor: '#22c55e',
          lineStyle: 'dashed',
        }),
        include,
      })
      expect(rel).toEqual(relRow)
    })

    it('descarta colores y estilos invalidos', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }])
      prismaMock.characterRelationship.findFirst.mockResolvedValue(null)
      prismaMock.characterRelationship.create.mockResolvedValue(relRow)

      await relationshipService.create('proj-1', 'user-1', {
        characterAId: 'char-1',
        characterBId: 'char-2',
        type: 'custom',
        lineColor: 'rojo',
        lineStyle: 'wavy',
      })

      expect(prismaMock.characterRelationship.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ lineColor: null, lineStyle: null }),
        include,
      })
    })

    it('lanza RelationshipExistsError si el par ya existe', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }])
      prismaMock.characterRelationship.findFirst.mockResolvedValue(relRow)

      await expect(
        relationshipService.create('proj-1', 'user-1', {
          characterAId: 'char-1',
          characterBId: 'char-2',
          type: 'friendship',
        }),
      ).rejects.toBeInstanceOf(RelationshipExistsError)
      expect(prismaMock.characterRelationship.create).not.toHaveBeenCalled()
    })

    it('lanza RelationshipNotFoundError si un personaje no existe o es el mismo', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.character.findMany.mockResolvedValue([{ id: 'char-1' }])

      await expect(
        relationshipService.create('proj-1', 'user-1', {
          characterAId: 'char-1',
          characterBId: 'char-2',
          type: 'romance',
        }),
      ).rejects.toBeInstanceOf(RelationshipNotFoundError)
    })
  })

  describe('update', () => {
    it('actualiza tipo y descripción sin tocar el par', async () => {
      prismaMock.characterRelationship.findFirst.mockResolvedValue(relRow)
      prismaMock.characterRelationship.update.mockResolvedValue({ ...relRow, type: 'family' })

      const rel = await relationshipService.update('rel-1', 'user-1', { type: 'family' })

      expect(prismaMock.characterRelationship.update).toHaveBeenCalledWith({
        where: { id: 'rel-1' },
        data: { type: 'family', label: undefined, description: undefined },
        include,
      })
      expect(rel?.type).toBe('family')
    })

    it('lanza RelationshipNotFoundError si no existe', async () => {
      prismaMock.characterRelationship.findFirst.mockResolvedValue(null)

      await expect(
        relationshipService.update('rel-1', 'user-1', { type: 'family' }),
      ).rejects.toBeInstanceOf(RelationshipNotFoundError)
    })
  })

  describe('remove', () => {
    it('borra y devuelve true; lanza si no existe', async () => {
      prismaMock.characterRelationship.findFirst.mockResolvedValue(relRow)
      prismaMock.characterRelationship.delete.mockResolvedValue(relRow)

      const removed = await relationshipService.remove('rel-1', 'user-1')

      expect(removed).toBe(true)
      expect(prismaMock.characterRelationship.delete).toHaveBeenCalledWith({ where: { id: 'rel-1' } })

      prismaMock.characterRelationship.findFirst.mockResolvedValue(null)
      await expect(relationshipService.remove('rel-1', 'user-1')).rejects.toBeInstanceOf(
        RelationshipNotFoundError,
      )
    })
  })
})
