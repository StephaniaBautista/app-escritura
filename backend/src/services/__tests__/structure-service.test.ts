import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    structureBoard: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    structureColumn: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    structureCard: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    document: { findMany: vi.fn() },
    $transaction: vi.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { structureService } from '../structure-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }
const boardRow = { id: 'board-1', projectId: 'proj-1', name: 'Estructura', order: 0, columns: [] }
const columnRow = { id: 'col-1', boardId: 'board-1', name: 'Inicio', order: 0, color: null, cards: [] }
const cardRow = { id: 'card-1', columnId: 'col-1', title: 'Escena 1', cardType: 'scene', order: 0 }

describe('structureService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises))
  })

  describe('boards', () => {
    it('listBoards devuelve null sin ownership', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      expect(await structureService.listBoards('proj-1', 'user-1')).toBeNull()
      expect(prismaMock.structureBoard.findMany).not.toHaveBeenCalled()
    })

    it('listBoards devuelve los boards existentes sin crear default', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.structureBoard.findMany.mockResolvedValue([boardRow])

      const result = await structureService.listBoards('proj-1', 'user-1')

      expect(result).toEqual([boardRow])
      expect(prismaMock.structureBoard.create).not.toHaveBeenCalled()
    })

    it('listBoards crea el board default con las 4 columnas si no hay ninguno', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.structureBoard.findMany.mockResolvedValue([])
      prismaMock.structureBoard.create.mockResolvedValue({ ...boardRow, columns: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }] })

      const result = await structureService.listBoards('proj-1', 'user-1')

      expect(prismaMock.structureBoard.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          name: 'Estructura',
          columns: {
            create: [
              { name: 'Inicio', order: 0 },
              { name: 'Desarrollo', order: 1 },
              { name: 'Climax', order: 2 },
              { name: 'Conclusión', order: 3 },
            ],
          },
        },
        include: expect.anything(),
      })
      expect(result).toHaveLength(1)
    })

    it('createBoard usa el contador como order', async () => {
      prismaMock.project.findFirst.mockResolvedValue(projectRow)
      prismaMock.structureBoard.count.mockResolvedValue(2)
      prismaMock.structureBoard.create.mockResolvedValue({ ...boardRow, order: 2 })

      await structureService.createBoard('proj-1', 'user-1', { name: 'Secundario' })

      expect(prismaMock.structureBoard.create).toHaveBeenCalledWith({
        data: { projectId: 'proj-1', name: 'Secundario', order: 2 },
        include: expect.anything(),
      })
    })

    it('updateBoard devuelve null si el board es de otro usuario', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(null)

      expect(await structureService.updateBoard('board-1', 'user-2', { name: 'X' })).toBeNull()
      expect(prismaMock.structureBoard.update).not.toHaveBeenCalled()
    })

    it('removeBoard borra y devuelve true', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(boardRow)
      prismaMock.structureBoard.delete.mockResolvedValue(boardRow)

      expect(await structureService.removeBoard('board-1', 'user-1')).toBe(true)
      expect(prismaMock.structureBoard.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } })
    })
  })

  describe('columns', () => {
    it('createColumn devuelve null si el board es ajeno', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(null)

      expect(await structureService.createColumn('board-1', 'user-2', { name: 'X' })).toBeNull()
      expect(prismaMock.structureColumn.create).not.toHaveBeenCalled()
    })

    it('createColumn usa el contador como order', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(boardRow)
      prismaMock.structureColumn.count.mockResolvedValue(4)
      prismaMock.structureColumn.create.mockResolvedValue({ ...columnRow, id: 'col-5', order: 4 })

      await structureService.createColumn('board-1', 'user-1', { name: 'Epílogo' })

      expect(prismaMock.structureColumn.create).toHaveBeenCalledWith({
        data: { boardId: 'board-1', name: 'Epílogo', color: null, order: 4 },
      })
    })

    it('updateColumn devuelve null si la columna es ajena', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue(null)

      expect(await structureService.updateColumn('col-1', 'user-2', { name: 'X' })).toBeNull()
      expect(prismaMock.structureColumn.update).not.toHaveBeenCalled()
    })

    it('removeColumn devuelve false si no existe', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue(null)

      expect(await structureService.removeColumn('col-1', 'user-1')).toBe(false)
      expect(prismaMock.structureColumn.delete).not.toHaveBeenCalled()
    })

    it('reorderColumns actualiza order por índice del array en una transacción', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue({
        ...boardRow,
        columns: [{ id: 'col-1' }, { id: 'col-2' }, { id: 'col-3' }],
      })
      prismaMock.structureColumn.update.mockResolvedValue({})
      prismaMock.structureColumn.findMany.mockResolvedValue([])

      await structureService.reorderColumns('board-1', 'user-1', ['col-3', 'col-1', 'col-2'])

      expect(prismaMock.structureColumn.update).toHaveBeenNthCalledWith(1, { where: { id: 'col-3' }, data: { order: 0 } })
      expect(prismaMock.structureColumn.update).toHaveBeenNthCalledWith(2, { where: { id: 'col-1' }, data: { order: 1 } })
      expect(prismaMock.structureColumn.update).toHaveBeenNthCalledWith(3, { where: { id: 'col-2' }, data: { order: 2 } })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    })

    it('reorderColumns ignora ids ajenos al board', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue({ ...boardRow, columns: [{ id: 'col-1' }] })
      prismaMock.structureColumn.update.mockResolvedValue({})
      prismaMock.structureColumn.findMany.mockResolvedValue([])

      await structureService.reorderColumns('board-1', 'user-1', ['col-ajena', 'col-1'])

      expect(prismaMock.structureColumn.update).toHaveBeenCalledTimes(1)
      expect(prismaMock.structureColumn.update).toHaveBeenCalledWith({ where: { id: 'col-1' }, data: { order: 0 } })
    })

    it('reorderColumns devuelve null si el board es ajeno', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(null)

      expect(await structureService.reorderColumns('board-1', 'user-2', ['col-1'])).toBeNull()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('cards', () => {
    it('createCard normaliza cardType inválido a scene y usa el contador como order', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue(columnRow)
      prismaMock.structureCard.count.mockResolvedValue(2)
      prismaMock.structureCard.create.mockResolvedValue(cardRow)

      await structureService.createCard('col-1', 'user-1', { title: 'Escena 1', cardType: 'inexistente' })

      expect(prismaMock.structureCard.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Escena 1', cardType: 'scene', order: 2, columnId: 'col-1' }),
      })
    })

    it('createCard devuelve null si la columna es ajena', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue(null)

      expect(await structureService.createCard('col-1', 'user-2', { title: 'X' })).toBeNull()
      expect(prismaMock.structureCard.create).not.toHaveBeenCalled()
    })

    it('updateCard devuelve null si la tarjeta es ajena', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(null)

      expect(await structureService.updateCard('card-1', 'user-2', { title: 'X' })).toBeNull()
      expect(prismaMock.structureCard.update).not.toHaveBeenCalled()
    })

    it('removeCard borra y devuelve true', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(cardRow)
      prismaMock.structureCard.delete.mockResolvedValue(cardRow)

      expect(await structureService.removeCard('card-1', 'user-1')).toBe(true)
      expect(prismaMock.structureCard.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } })
    })

    it('reorderCards actualiza order por índice del array en una transacción', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue({ ...columnRow, cards: [{ id: 'card-1' }, { id: 'card-2' }] })
      prismaMock.structureCard.update.mockResolvedValue({})
      prismaMock.structureCard.findMany.mockResolvedValue([])

      await structureService.reorderCards('col-1', 'user-1', ['card-2', 'card-1'])

      expect(prismaMock.structureCard.update).toHaveBeenNthCalledWith(1, { where: { id: 'card-2' }, data: { order: 0 } })
      expect(prismaMock.structureCard.update).toHaveBeenNthCalledWith(2, { where: { id: 'card-1' }, data: { order: 1 } })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    })

    it('reorderCards devuelve null si la columna es ajena', async () => {
      prismaMock.structureColumn.findFirst.mockResolvedValue(null)

      expect(await structureService.reorderCards('col-1', 'user-2', ['card-1'])).toBeNull()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('syncChaptersFromDocuments', () => {
    it('creates chapter cards for missing documents in the first column', async () => {
      prismaMock.structureBoard.findFirst
        .mockResolvedValueOnce({
          ...boardRow,
          projectId: 'proj-1',
          columns: [{ ...columnRow, cards: [] }],
        })
        .mockResolvedValueOnce({ ...boardRow, columns: [{ ...columnRow, cards: [{ id: 'new-card' }] }] })
      prismaMock.document.findMany.mockResolvedValue([
        { id: 'ch-1', title: 'Capítulo 1' },
        { id: 'ch-2', title: 'Capítulo 2' },
      ])
      prismaMock.structureCard.count.mockResolvedValue(0)
      prismaMock.structureCard.create.mockResolvedValue({})

      const result = await structureService.syncChaptersFromDocuments('board-1', 'user-1')

      expect(prismaMock.structureCard.create).toHaveBeenCalledTimes(2)
      expect(prismaMock.structureCard.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ columnId: 'col-1', title: 'Capítulo 1', cardType: 'chapter', referenceId: 'ch-1', order: 0 }),
      })
      expect(result).toEqual(expect.objectContaining({ created: 2 }))
    })

    it('skips chapters already linked on the board', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue({
        ...boardRow,
        columns: [{
          ...columnRow,
          cards: [{ id: 'card-1', referenceId: 'ch-1', columnId: 'col-1' }],
        }],
      })
      prismaMock.document.findMany.mockResolvedValue([{ id: 'ch-1', title: 'Capítulo 1' }])

      const result = await structureService.syncChaptersFromDocuments('board-1', 'user-1')

      expect(prismaMock.structureCard.create).not.toHaveBeenCalled()
      expect(result).toEqual({ created: 0, board: expect.anything() })
    })

    it('returns null when the board is foreign', async () => {
      prismaMock.structureBoard.findFirst.mockResolvedValue(null)
      expect(await structureService.syncChaptersFromDocuments('board-1', 'user-2')).toBeNull()
    })
  })

  describe('moveCard', () => {
    it('mueve la tarjeta a otra columna reordenando origen y destino', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(cardRow)
      prismaMock.structureColumn.findFirst.mockResolvedValue({
        id: 'col-2',
        cards: [{ id: 'card-9', order: 0 }],
      })
      prismaMock.structureCard.findMany.mockResolvedValue([{ id: 'card-2', order: 1 }])
      prismaMock.structureCard.update.mockResolvedValue({})
      prismaMock.structureCard.findUnique.mockResolvedValue({ ...cardRow, columnId: 'col-2' })

      const result = await structureService.moveCard('card-1', 'user-1', { toColumnId: 'col-2', toIndex: 1 })

      expect(prismaMock.structureCard.update).toHaveBeenCalledWith({ where: { id: 'card-9' }, data: { order: 0, columnId: 'col-2' } })
      expect(prismaMock.structureCard.update).toHaveBeenCalledWith({ where: { id: 'card-1' }, data: { order: 1, columnId: 'col-2' } })
      expect(prismaMock.structureCard.update).toHaveBeenCalledWith({ where: { id: 'card-2' }, data: { order: 0 } })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ ...cardRow, columnId: 'col-2' })
    })

    it('reordena dentro de la misma columna sin tocar el origen', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(cardRow)
      prismaMock.structureColumn.findFirst.mockResolvedValue({
        id: 'col-1',
        cards: [{ id: 'card-1', order: 0 }, { id: 'card-2', order: 1 }],
      })
      prismaMock.structureCard.update.mockResolvedValue({})
      prismaMock.structureCard.findUnique.mockResolvedValue(cardRow)

      await structureService.moveCard('card-1', 'user-1', { toColumnId: 'col-1', toIndex: 1 })

      expect(prismaMock.structureCard.update).toHaveBeenCalledTimes(2)
      expect(prismaMock.structureCard.findMany).not.toHaveBeenCalled()
    })

    it('clampa toIndex al final de la columna destino', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(cardRow)
      prismaMock.structureColumn.findFirst.mockResolvedValue({ id: 'col-2', cards: [] })
      prismaMock.structureCard.findMany.mockResolvedValue([])
      prismaMock.structureCard.update.mockResolvedValue({})
      prismaMock.structureCard.findUnique.mockResolvedValue(cardRow)

      await structureService.moveCard('card-1', 'user-1', { toColumnId: 'col-2', toIndex: 99 })

      expect(prismaMock.structureCard.update).toHaveBeenCalledWith({ where: { id: 'card-1' }, data: { order: 0, columnId: 'col-2' } })
    })

    it('devuelve null si la tarjeta es ajena', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(null)

      expect(await structureService.moveCard('card-1', 'user-2', { toColumnId: 'col-2', toIndex: 0 })).toBeNull()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('devuelve null si la columna destino es ajena', async () => {
      prismaMock.structureCard.findFirst.mockResolvedValue(cardRow)
      prismaMock.structureColumn.findFirst.mockResolvedValue(null)

      expect(await structureService.moveCard('card-1', 'user-1', { toColumnId: 'col-ajena', toIndex: 0 })).toBeNull()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('devuelve null si falta toColumnId o toIndex', async () => {
      expect(await structureService.moveCard('card-1', 'user-1', { toIndex: 0 })).toBeNull()
      expect(await structureService.moveCard('card-1', 'user-1', { toColumnId: 'col-2' })).toBeNull()
      expect(prismaMock.structureCard.findFirst).not.toHaveBeenCalled()
    })
  })
})
