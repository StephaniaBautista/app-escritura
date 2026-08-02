import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    document: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
    note: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { noteService } from '../note-service.js'

const docRow = { id: 'doc-1', title: 'Capítulo 1', content: {}, type: 'document', order: 0, userId: 'user-1', projectId: 'proj-1', folderId: null, parentId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') }
const projectRow = { id: 'proj-1', name: 'Mi novela', description: null, userId: 'user-1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') }

const noteRow = {
  id: 'note-1',
  title: 'Idea',
  content: 'Recuerda el bosque',
  documentId: 'doc-1',
  projectId: 'proj-1',
  isHidden: false,
  userId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('noteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listByDocument: filtra por documento y usuario, ordena por creación descendente', async () => {
    prismaMock.note.findMany.mockResolvedValue([noteRow])

    const notes = await noteService.listByDocument('doc-1', 'user-1')

    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1', userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    })
    expect(notes).toEqual([noteRow])
  })

  it('listByProject: filtra por proyecto, usuario y notas sin documento (generales)', async () => {
    prismaMock.note.findMany.mockResolvedValue([noteRow])

    const notes = await noteService.listByProject('proj-1', 'user-1')

    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1', userId: 'user-1', documentId: null },
      orderBy: { createdAt: 'desc' },
    })
    expect(notes).toEqual([noteRow])
  })

  it('createForDocument: verifica ownership del documento y guarda el projectId', async () => {
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.note.create.mockResolvedValue(noteRow)

    const note = await noteService.createForDocument('doc-1', 'user-1', { title: 'Idea', content: 'Recuerda el bosque' })

    expect(prismaMock.document.findFirst).toHaveBeenCalledWith({ where: { id: 'doc-1', userId: 'user-1' } })
    expect(prismaMock.note.create).toHaveBeenCalledWith({
      data: { title: 'Idea', content: 'Recuerda el bosque', documentId: 'doc-1', projectId: 'proj-1', userId: 'user-1' },
    })
    expect(note).toEqual(noteRow)
  })

  it('createForDocument: devuelve null si el documento no pertenece al usuario', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)

    const note = await noteService.createForDocument('doc-1', 'user-1', { title: 'Idea' })

    expect(note).toBeNull()
    expect(prismaMock.note.create).not.toHaveBeenCalled()
  })

  it('createForProject: crea nota general sin documentId tras verificar el proyecto', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.note.create.mockResolvedValue({ ...noteRow, documentId: null })

    const note = await noteService.createForProject('proj-1', 'user-1', { title: 'Regla del mundo' })

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({ where: { id: 'proj-1', userId: 'user-1' } })
    expect(prismaMock.note.create).toHaveBeenCalledWith({
      data: { title: 'Regla del mundo', content: '', projectId: 'proj-1', userId: 'user-1' },
    })
    expect(note?.documentId).toBeNull()
  })

  it('createForProject: devuelve null si el proyecto no pertenece al usuario', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    const note = await noteService.createForProject('proj-1', 'user-1', { title: 'x' })

    expect(note).toBeNull()
    expect(prismaMock.note.create).not.toHaveBeenCalled()
  })

  it('update: verifica ownership de la nota', async () => {
    prismaMock.note.findFirst.mockResolvedValue(noteRow)
    prismaMock.note.update.mockResolvedValue({ ...noteRow, content: 'Cambiado' })

    const note = await noteService.update('note-1', 'user-1', { content: 'Cambiado' })

    expect(prismaMock.note.findFirst).toHaveBeenCalledWith({ where: { id: 'note-1', userId: 'user-1' } })
    expect(note).toEqual({ ...noteRow, content: 'Cambiado' })
  })

  it('update: persiste isHidden cuando se oculta/muestra', async () => {
    prismaMock.note.findFirst.mockResolvedValue(noteRow)
    prismaMock.note.update.mockResolvedValue({ ...noteRow, isHidden: true })

    await noteService.update('note-1', 'user-1', { isHidden: true })

    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: { title: undefined, content: undefined, isHidden: true },
    })
  })

  it('update: devuelve null si la nota no pertenece al usuario', async () => {
    prismaMock.note.findFirst.mockResolvedValue(null)

    const note = await noteService.update('note-1', 'user-1', { content: 'x' })

    expect(note).toBeNull()
    expect(prismaMock.note.update).not.toHaveBeenCalled()
  })

  it('delete: elimina solo si la nota es del usuario y devuelve true', async () => {
    prismaMock.note.findFirst.mockResolvedValue(noteRow)
    prismaMock.note.delete.mockResolvedValue(noteRow)

    const deleted = await noteService.delete('note-1', 'user-1')

    expect(deleted).toBe(true)
    expect(prismaMock.note.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } })
  })

  it('delete: devuelve false si no existe o es de otro usuario', async () => {
    prismaMock.note.findFirst.mockResolvedValue(null)

    const deleted = await noteService.delete('note-1', 'user-1')

    expect(deleted).toBe(false)
    expect(prismaMock.note.delete).not.toHaveBeenCalled()
  })
})