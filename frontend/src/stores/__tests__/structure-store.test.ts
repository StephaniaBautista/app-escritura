import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StructureBoard, StructureCard, StructureColumn, Subplot } from '@/types/structure'

const { structureApiMock, subplotsApiMock, toastMock } = vi.hoisted(() => ({
  structureApiMock: {
    listBoards: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    deleteBoard: vi.fn(),
    createColumn: vi.fn(),
    updateColumn: vi.fn(),
    deleteColumn: vi.fn(),
    reorderColumns: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    reorderCards: vi.fn(),
    moveCard: vi.fn(),
  },
  subplotsApiMock: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/services/structure', () => ({
  structureApi: structureApiMock,
  subplotsApi: subplotsApiMock,
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: {
    getState: () => toastMock,
  },
}))

vi.mock('@/i18n', () => ({ default: { t: (k: string) => k } }))

import { useStructureStore, applyCardMove } from '../structure-store'

function makeCard(id: string, columnId: string, order: number): StructureCard {
  return {
    id,
    columnId,
    title: `Card ${id}`,
    description: null,
    cardType: 'scene',
    referenceId: null,
    color: null,
    subplotId: null,
    order,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeColumn(id: string, boardId: string, order: number, cards: StructureCard[]): StructureColumn {
  return {
    id,
    boardId,
    name: `Column ${id}`,
    color: null,
    order,
    cards,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeBoard(): StructureBoard {
  return {
    id: 'board-1',
    projectId: 'proj-1',
    name: 'Estructura',
    order: 0,
    columns: [
      makeColumn('col-1', 'board-1', 0, [makeCard('card-a', 'col-1', 0), makeCard('card-b', 'col-1', 1)]),
      makeColumn('col-2', 'board-1', 1, [makeCard('card-c', 'col-2', 0)]),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeSubplot(id: string, order: number): Subplot {
  return {
    id,
    projectId: 'proj-1',
    title: `Subplot ${id}`,
    description: null,
    status: 'active',
    color: null,
    order,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function columnCardIds(board: StructureBoard, columnId: string): string[] {
  const column = (board.columns ?? []).find((c) => c.id === columnId)
  return (column?.cards ?? []).map((c) => c.id)
}

describe('useStructureStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStructureStore.setState({
      boards: [],
      activeBoardId: null,
      projectId: null,
      subplots: [],
      hiddenSubplotIds: [],
      isLoadingBoards: false,
      isLoadingSubplots: false,
    })
  })

  it('loadBoards: guarda boards y activa el primero', async () => {
    const board = makeBoard()
    structureApiMock.listBoards.mockResolvedValue([board])

    await useStructureStore.getState().loadBoards('proj-1')

    expect(structureApiMock.listBoards).toHaveBeenCalledWith('proj-1')
    expect(useStructureStore.getState().boards).toEqual([board])
    expect(useStructureStore.getState().activeBoardId).toBe('board-1')
    expect(useStructureStore.getState().projectId).toBe('proj-1')
  })

  it('loadBoards: error muestra toast sin lanzar', async () => {
    structureApiMock.listBoards.mockRejectedValue(new Error('boom'))

    await useStructureStore.getState().loadBoards('proj-1')

    expect(toastMock.error).toHaveBeenCalledWith('boom')
    expect(useStructureStore.getState().boards).toEqual([])
  })

  it('applyCardMove: mueve entre columnas con índice y orden recalculado', () => {
    const board = makeBoard()

    const next = applyCardMove([board], 'card-a', 'col-2', 1)

    expect(next).not.toBeNull()
    expect(columnCardIds(next![0], 'col-1')).toEqual(['card-b'])
    expect(columnCardIds(next![0], 'col-2')).toEqual(['card-c', 'card-a'])
    const moved = next![0].columns![1].cards![1]
    expect(moved.columnId).toBe('col-2')
    expect(moved.order).toBe(1)
    expect(next![0].columns![0].cards![0].order).toBe(0)
  })

  it('applyCardMove: reordena dentro de la misma columna', () => {
    const board = makeBoard()

    const next = applyCardMove([board], 'card-a', 'col-1', 1)

    expect(columnCardIds(next![0], 'col-1')).toEqual(['card-b', 'card-a'])
  })

  it('applyCardMove: clamp del índice al final de la columna destino', () => {
    const board = makeBoard()

    const next = applyCardMove([board], 'card-c', 'col-1', 99)

    expect(columnCardIds(next![0], 'col-1')).toEqual(['card-a', 'card-b', 'card-c'])
  })

  it('applyCardMove: devuelve null si la tarjeta no existe', () => {
    expect(applyCardMove([makeBoard()], 'card-x', 'col-1', 0)).toBeNull()
    expect(applyCardMove([makeBoard()], 'card-a', 'col-x', 0)).toBeNull()
  })

  it('moveCard: aplica el movimiento optimista y persiste', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })
    structureApiMock.moveCard.mockResolvedValue(makeCard('card-a', 'col-2', 1))

    await useStructureStore.getState().moveCard('card-a', 'col-2', 1)

    expect(structureApiMock.moveCard).toHaveBeenCalledWith('card-a', 'col-2', 1)
    const board = useStructureStore.getState().boards[0]
    expect(columnCardIds(board, 'col-1')).toEqual(['card-b'])
    expect(columnCardIds(board, 'col-2')).toEqual(['card-c', 'card-a'])
  })

  it('moveCard: rollback + toast + refetch si la API falla', async () => {
    const board = makeBoard()
    useStructureStore.setState({ boards: [board], projectId: 'proj-1' })
    structureApiMock.moveCard.mockRejectedValue(new Error('boom'))
    structureApiMock.listBoards.mockResolvedValue([board])

    await useStructureStore.getState().moveCard('card-a', 'col-2', 0)

    expect(toastMock.error).toHaveBeenCalledWith('structureApp.errorMoveCard')
    expect(structureApiMock.listBoards).toHaveBeenCalledWith('proj-1')
    expect(useStructureStore.getState().boards).toEqual([board])
    expect(columnCardIds(useStructureStore.getState().boards[0], 'col-1')).toEqual(['card-a', 'card-b'])
  })

  it('moveCard: no llama a la API si la tarjeta no existe', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })

    await useStructureStore.getState().moveCard('card-x', 'col-2', 0)

    expect(structureApiMock.moveCard).not.toHaveBeenCalled()
  })

  it('reorderColumns: reordena optimista y persiste', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })
    structureApiMock.reorderColumns.mockResolvedValue([])

    await useStructureStore.getState().reorderColumns('board-1', ['col-2', 'col-1'])

    expect(structureApiMock.reorderColumns).toHaveBeenCalledWith('board-1', ['col-2', 'col-1'])
    const columns = useStructureStore.getState().boards[0].columns ?? []
    expect(columns.map((c) => c.id)).toEqual(['col-2', 'col-1'])
    expect(columns.map((c) => c.order)).toEqual([0, 1])
  })

  it('reorderColumns: rollback + toast + refetch si la API falla', async () => {
    const board = makeBoard()
    useStructureStore.setState({ boards: [board], projectId: 'proj-1' })
    structureApiMock.reorderColumns.mockRejectedValue(new Error('boom'))
    structureApiMock.listBoards.mockResolvedValue([board])

    await useStructureStore.getState().reorderColumns('board-1', ['col-2', 'col-1'])

    expect(toastMock.error).toHaveBeenCalledWith('structureApp.errorReorderColumns')
    expect(structureApiMock.listBoards).toHaveBeenCalledWith('proj-1')
    const columns = useStructureStore.getState().boards[0].columns ?? []
    expect(columns.map((c) => c.id)).toEqual(['col-1', 'col-2'])
  })

  it('createColumn: añade la columna con lista de tarjetas vacía', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })
    const created = makeColumn('col-3', 'board-1', 2, [])
    const { cards: _omit, ...apiColumn } = created
    structureApiMock.createColumn.mockResolvedValue(apiColumn)

    const column = await useStructureStore.getState().createColumn('board-1', { name: 'Nueva' })

    expect(structureApiMock.createColumn).toHaveBeenCalledWith('board-1', { name: 'Nueva' })
    expect(column?.cards).toEqual([])
    const columns = useStructureStore.getState().boards[0].columns ?? []
    expect(columns.map((c) => c.id)).toEqual(['col-1', 'col-2', 'col-3'])
  })

  it('updateColumn: conserva las tarjetas al reemplazar la columna', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })
    const { cards: _omit, ...apiColumn } = makeColumn('col-1', 'board-1', 0, [])
    structureApiMock.updateColumn.mockResolvedValue({ ...apiColumn, name: 'Renombrada' })

    await useStructureStore.getState().updateColumn('col-1', { name: 'Renombrada' })

    const column = (useStructureStore.getState().boards[0].columns ?? []).find((c) => c.id === 'col-1')
    expect(column?.name).toBe('Renombrada')
    expect((column?.cards ?? []).map((c) => c.id)).toEqual(['card-a', 'card-b'])
  })

  it('removeCard: elimina la tarjeta de su columna', async () => {
    useStructureStore.setState({ boards: [makeBoard()], projectId: 'proj-1' })
    structureApiMock.deleteCard.mockResolvedValue(undefined)

    await useStructureStore.getState().removeCard('card-a')

    expect(structureApiMock.deleteCard).toHaveBeenCalledWith('card-a')
    expect(columnCardIds(useStructureStore.getState().boards[0], 'col-1')).toEqual(['card-b'])
  })

  it('reorderSubplots: reordena optimista y reconcilia con la respuesta', async () => {
    const subplots = [makeSubplot('sub-1', 0), makeSubplot('sub-2', 1), makeSubplot('sub-3', 2)]
    useStructureStore.setState({ subplots, projectId: 'proj-1' })
    const serverOrder = [makeSubplot('sub-3', 0), makeSubplot('sub-1', 1), makeSubplot('sub-2', 2)]
    subplotsApiMock.reorder.mockResolvedValue(serverOrder)

    await useStructureStore.getState().reorderSubplots('proj-1', ['sub-3', 'sub-1', 'sub-2'])

    expect(subplotsApiMock.reorder).toHaveBeenCalledWith('proj-1', ['sub-3', 'sub-1', 'sub-2'])
    expect(useStructureStore.getState().subplots).toEqual(serverOrder)
  })

  it('reorderSubplots: rollback + toast + refetch si la API falla', async () => {
    const subplots = [makeSubplot('sub-1', 0), makeSubplot('sub-2', 1)]
    useStructureStore.setState({ subplots, projectId: 'proj-1' })
    subplotsApiMock.reorder.mockRejectedValue(new Error('boom'))
    subplotsApiMock.list.mockResolvedValue(subplots)

    await useStructureStore.getState().reorderSubplots('proj-1', ['sub-2', 'sub-1'])

    expect(toastMock.error).toHaveBeenCalledWith('structureApp.errorReorderSubplots')
    expect(subplotsApiMock.list).toHaveBeenCalledWith('proj-1')
    expect(useStructureStore.getState().subplots).toEqual(subplots)
  })

  it('createSubplot: añade la subtrama a la lista', async () => {
    useStructureStore.setState({ subplots: [], projectId: 'proj-1' })
    const subplot = makeSubplot('sub-1', 0)
    subplotsApiMock.create.mockResolvedValue(subplot)

    const created = await useStructureStore.getState().createSubplot('proj-1', { title: 'Subplot sub-1' })

    expect(created).toEqual(subplot)
    expect(useStructureStore.getState().subplots).toHaveLength(1)
  })

  it('toggleSubplotVisibility / setAllSubplotsVisible: estado en memoria de la capa fantasma', () => {
    const subplots = [makeSubplot('sub-1', 0), makeSubplot('sub-2', 1)]
    useStructureStore.setState({ subplots, hiddenSubplotIds: [] })
    const store = useStructureStore.getState()

    store.toggleSubplotVisibility('sub-1')
    expect(useStructureStore.getState().hiddenSubplotIds).toEqual(['sub-1'])
    store.toggleSubplotVisibility('sub-1')
    expect(useStructureStore.getState().hiddenSubplotIds).toEqual([])

    store.setAllSubplotsVisible(false)
    expect(useStructureStore.getState().hiddenSubplotIds).toEqual(['sub-1', 'sub-2'])
    store.setAllSubplotsVisible(true)
    expect(useStructureStore.getState().hiddenSubplotIds).toEqual([])
  })

  it('loadSubplots: descarta ids ocultos que ya no existen', async () => {
    useStructureStore.setState({ hiddenSubplotIds: ['sub-1', 'sub-gone'] })
    subplotsApiMock.list.mockResolvedValue([makeSubplot('sub-1', 0)])

    await useStructureStore.getState().loadSubplots('proj-1')

    expect(useStructureStore.getState().hiddenSubplotIds).toEqual(['sub-1'])
  })

  it('removeSubplot: desasocia las tarjetas y limpia el id oculto', async () => {
    const board = makeBoard()
    board.columns![0].cards![0].subplotId = 'sub-1'
    useStructureStore.setState({ boards: [board], subplots: [makeSubplot('sub-1', 0)], hiddenSubplotIds: ['sub-1'] })
    subplotsApiMock.delete.mockResolvedValue(undefined)

    await useStructureStore.getState().removeSubplot('sub-1')

    const state = useStructureStore.getState()
    expect(state.subplots).toEqual([])
    expect(state.hiddenSubplotIds).toEqual([])
    expect(state.boards[0].columns![0].cards![0].subplotId).toBeNull()
  })
})
