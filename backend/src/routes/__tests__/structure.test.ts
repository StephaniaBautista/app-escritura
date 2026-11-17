import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getSessionUser: vi.fn(),
    structureService: {
      listBoards: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      removeBoard: vi.fn(),
      createColumn: vi.fn(),
      updateColumn: vi.fn(),
      removeColumn: vi.fn(),
      reorderColumns: vi.fn(),
      createCard: vi.fn(),
      updateCard: vi.fn(),
      removeCard: vi.fn(),
      reorderCards: vi.fn(),
      moveCard: vi.fn(),
    },
  },
}))

vi.mock('../../lib/session.js', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('../../services/structure-service.js', () => ({ structureService: mocks.structureService }))

import { structureRoutes } from '../structure.js'
import { SubplotNotInProjectError } from '../../lib/subplot-errors.js'

async function buildApp() {
  const app = Fastify()
  await app.register(structureRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

const boardRow = {
  id: 'board-1',
  projectId: 'proj-1',
  name: 'Estructura',
  order: 0,
  columns: [
    { id: 'col-1', name: 'Inicio', order: 0, color: null, cards: [] },
    { id: 'col-2', name: 'Desarrollo', order: 1, color: null, cards: [] },
  ],
}

const cardRow = {
  id: 'card-1',
  columnId: 'col-1',
  title: 'Escena 1',
  description: null,
  cardType: 'scene',
  referenceId: null,
  color: null,
  order: 0,
}

describe('structureRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', email: 'a@b.c' })
  })

  it('401 sin sesión', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/boards' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('GET /projects/:projectId/boards devuelve la lista', async () => {
    mocks.structureService.listBoards.mockResolvedValue([boardRow])
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/boards' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([expect.objectContaining({ id: 'board-1' })])
    expect(mocks.structureService.listBoards).toHaveBeenCalledWith('proj-1', 'user-1')
    await app.close()
  })

  it('GET /projects/:projectId/boards: 404 si el proyecto no es del usuario', async () => {
    mocks.structureService.listBoards.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/boards' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('POST /projects/:projectId/boards: 201 y llama al service con el body', async () => {
    mocks.structureService.createBoard.mockResolvedValue(boardRow)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-1/boards',
      payload: { name: 'Secundario' },
    })
    expect(res.statusCode).toBe(201)
    expect(mocks.structureService.createBoard).toHaveBeenCalledWith('proj-1', 'user-1', { name: 'Secundario' })
    await app.close()
  })

  it('POST /projects/:projectId/boards: 400 sin name (validación de schema)', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-1/boards',
      payload: { order: 1 },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PUT /boards/:id: 404 si el board es ajeno', async () => {
    mocks.structureService.updateBoard.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'PUT', url: '/api/boards/board-1', payload: { name: 'X' } })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('DELETE /boards/:id: 204 si se borra', async () => {
    mocks.structureService.removeBoard.mockResolvedValue(true)
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/api/boards/board-1' })
    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('PUT /boards/:boardId/columns/reorder: reordena y devuelve las columnas', async () => {
    mocks.structureService.reorderColumns.mockResolvedValue(boardRow.columns)
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/boards/board-1/columns/reorder',
      payload: { columnIds: ['col-2', 'col-1'] },
    })
    expect(res.statusCode).toBe(200)
    expect(mocks.structureService.reorderColumns).toHaveBeenCalledWith('board-1', 'user-1', ['col-2', 'col-1'])
    await app.close()
  })

  it('PUT /boards/:boardId/columns/reorder: 400 sin columnIds', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/boards/board-1/columns/reorder',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('POST /columns/:columnId/cards: 201 con cardType del enum', async () => {
    mocks.structureService.createCard.mockResolvedValue(cardRow)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/columns/col-1/cards',
      payload: { title: 'Escena 1', cardType: 'chapter' },
    })
    expect(res.statusCode).toBe(201)
    expect(mocks.structureService.createCard).toHaveBeenCalledWith('col-1', 'user-1', { title: 'Escena 1', cardType: 'chapter' })
    await app.close()
  })

  it('POST /columns/:columnId/cards: 400 con cardType fuera del enum', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/columns/col-1/cards',
      payload: { title: 'Escena 1', cardType: 'inexistente' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PUT /cards/:id: acepta subplotId y devuelve 400 SUBPLOT_NOT_IN_PROJECT si el service lo rechaza', async () => {
    mocks.structureService.updateCard.mockResolvedValueOnce({ ...cardRow, subplotId: 'sub-1' })
    const app = await buildApp()
    const ok = await app.inject({ method: 'PUT', url: '/api/cards/card-1', payload: { subplotId: 'sub-1' } })
    expect(ok.statusCode).toBe(200)
    expect(mocks.structureService.updateCard).toHaveBeenCalledWith('card-1', 'user-1', { subplotId: 'sub-1' })

    mocks.structureService.updateCard.mockRejectedValueOnce(new SubplotNotInProjectError())
    const bad = await app.inject({ method: 'PUT', url: '/api/cards/card-1', payload: { subplotId: 'sub-ajena' } })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().error.code).toBe('SUBPLOT_NOT_IN_PROJECT')
    await app.close()
  })

  it('POST /columns/:columnId/cards: 404 si la columna es ajena', async () => {
    mocks.structureService.createCard.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/columns/col-ajena/cards',
      payload: { title: 'Escena 1' },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('PUT /cards/:id/move: mueve la tarjeta entre columnas', async () => {
    mocks.structureService.moveCard.mockResolvedValue({ ...cardRow, columnId: 'col-2' })
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/cards/card-1/move',
      payload: { toColumnId: 'col-2', toIndex: 0 },
    })
    expect(res.statusCode).toBe(200)
    expect(mocks.structureService.moveCard).toHaveBeenCalledWith('card-1', 'user-1', { toColumnId: 'col-2', toIndex: 0 })
    await app.close()
  })

  it('PUT /cards/:id/move: 400 sin toColumnId', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/cards/card-1/move',
      payload: { toIndex: 0 },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PUT /columns/:columnId/cards/reorder: reordena las tarjetas', async () => {
    mocks.structureService.reorderCards.mockResolvedValue([cardRow])
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/columns/col-1/cards/reorder',
      payload: { cardIds: ['card-1'] },
    })
    expect(res.statusCode).toBe(200)
    expect(mocks.structureService.reorderCards).toHaveBeenCalledWith('col-1', 'user-1', ['card-1'])
    await app.close()
  })
})
