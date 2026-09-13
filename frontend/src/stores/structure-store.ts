import { create } from 'zustand'
import type {
  StructureBoard, BoardInput,
  StructureColumn, ColumnInput,
  StructureCard, CardInput,
  Subplot, SubplotInput,
} from '@/types/structure'
import { structureApi, subplotsApi } from '@/services/structure'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface StructureState {
  boards: StructureBoard[]
  activeBoardId: string | null
  projectId: string | null
  subplots: Subplot[]
  isLoadingBoards: boolean
  isLoadingSubplots: boolean

  loadBoards: (projectId: string) => Promise<void>
  setActiveBoard: (id: string) => void
  createBoard: (projectId: string, data: BoardInput) => Promise<StructureBoard | null>
  updateBoard: (id: string, data: BoardInput) => Promise<StructureBoard | null>
  removeBoard: (id: string) => Promise<void>

  createColumn: (boardId: string, data: ColumnInput) => Promise<StructureColumn | null>
  updateColumn: (id: string, data: ColumnInput) => Promise<StructureColumn | null>
  removeColumn: (id: string) => Promise<void>
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>

  createCard: (columnId: string, data: CardInput) => Promise<StructureCard | null>
  updateCard: (id: string, data: CardInput) => Promise<StructureCard | null>
  removeCard: (id: string) => Promise<void>
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => Promise<void>
  syncChapters: (boardId: string) => Promise<number>

  loadSubplots: (projectId: string) => Promise<void>
  createSubplot: (projectId: string, data: SubplotInput) => Promise<Subplot | null>
  updateSubplot: (id: string, data: SubplotInput) => Promise<Subplot | null>
  removeSubplot: (id: string) => Promise<void>
  reorderSubplots: (projectId: string, subplotIds: string[]) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

function patchBoard(
  boards: StructureBoard[],
  boardId: string,
  patch: (board: StructureBoard) => StructureBoard,
): StructureBoard[] {
  return boards.map((board) => (board.id === boardId ? patch(board) : board))
}

function patchColumnInBoards(
  boards: StructureBoard[],
  columnId: string,
  patch: (column: StructureColumn) => StructureColumn,
): StructureBoard[] {
  return boards.map((board) => ({
    ...board,
    columns: (board.columns ?? []).map((column) => (column.id === columnId ? patch(column) : column)),
  }))
}

export function applyCardMove(
  boards: StructureBoard[],
  cardId: string,
  toColumnId: string,
  toIndex: number,
): StructureBoard[] | null {
  let card: StructureCard | null = null
  for (const board of boards) {
    for (const column of board.columns ?? []) {
      const found = (column.cards ?? []).find((candidate) => candidate.id === cardId)
      if (found) {
        card = found
        break
      }
    }
    if (card) break
  }
  if (!card) return null
  const targetExists = boards.some((board) =>
    (board.columns ?? []).some((column) => column.id === toColumnId),
  )
  if (!targetExists) return null
  const movedCard = card
  let touched = false
  const next = boards.map((board) => {
    const columns = (board.columns ?? []).map((column) => {
      let cards = (column.cards ?? []).filter((candidate) => candidate.id !== movedCard.id)
      const isSource = cards.length !== (column.cards ?? []).length
      const isTarget = column.id === toColumnId
      if (!isSource && !isTarget) return column
      touched = true
      if (isTarget) {
        const index = Math.max(0, Math.min(toIndex, cards.length))
        cards = [...cards.slice(0, index), { ...movedCard, columnId: toColumnId }, ...cards.slice(index)]
      }
      return { ...column, cards: cards.map((item, index) => ({ ...item, order: index })) }
    })
    return { ...board, columns }
  })
  return touched ? next : null
}

export const useStructureStore = create<StructureState>()((set, get) => {
  async function rollbackBoards(snapshot: StructureBoard[], messageKey: string) {
    set({ boards: snapshot })
    useToastStore.getState().error(i18n.t(messageKey))
    const projectId = get().projectId
    if (projectId) await get().loadBoards(projectId)
  }

  return {
    boards: [],
    activeBoardId: null,
    projectId: null,
    subplots: [],
    isLoadingBoards: false,
    isLoadingSubplots: false,

    async loadBoards(projectId) {
      set({ isLoadingBoards: true, projectId })
      try {
        const boards = await structureApi.listBoards(projectId)
        set((state) => ({
          boards,
          isLoadingBoards: false,
          activeBoardId: state.activeBoardId && boards.some((b) => b.id === state.activeBoardId)
            ? state.activeBoardId
            : boards[0]?.id ?? null,
        }))
      } catch (err: unknown) {
        set({ isLoadingBoards: false })
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    setActiveBoard(id) {
      set({ activeBoardId: id })
    },

    async createBoard(projectId, data) {
      try {
        const board = await structureApi.createBoard(projectId, data)
        set({ boards: [...get().boards, board], activeBoardId: board.id })
        return board
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async updateBoard(id, data) {
      try {
        const board = await structureApi.updateBoard(id, data)
        set({ boards: get().boards.map((b) => (b.id === id ? board : b)) })
        return board
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async removeBoard(id) {
      try {
        await structureApi.deleteBoard(id)
        set((state) => {
          const boards = state.boards.filter((b) => b.id !== id)
          return {
            boards,
            activeBoardId: state.activeBoardId === id ? boards[0]?.id ?? null : state.activeBoardId,
          }
        })
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    async createColumn(boardId, data) {
      try {
        const column = await structureApi.createColumn(boardId, data)
        const withCards: StructureColumn = { ...column, cards: column.cards ?? [] }
        set({
          boards: patchBoard(get().boards, boardId, (board) => ({
            ...board,
            columns: [...(board.columns ?? []), withCards],
          })),
        })
        return withCards
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async updateColumn(id, data) {
      try {
        const column = await structureApi.updateColumn(id, data)
        set({
          boards: patchColumnInBoards(get().boards, id, (current) => ({
            ...column,
            cards: current.cards ?? [],
          })),
        })
        return column
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async removeColumn(id) {
      try {
        await structureApi.deleteColumn(id)
        set({
          boards: get().boards.map((board) => ({
            ...board,
            columns: (board.columns ?? []).filter((column) => column.id !== id),
          })),
        })
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    async reorderColumns(boardId, columnIds) {
      const snapshot = get().boards
      const board = snapshot.find((b) => b.id === boardId)
      if (!board) return
      const byId = new Map((board.columns ?? []).map((column) => [column.id, column]))
      const nextColumns = columnIds
        .map((id) => byId.get(id))
        .filter((column): column is StructureColumn => Boolean(column))
        .map((column, index) => ({ ...column, order: index }))
      set({ boards: patchBoard(snapshot, boardId, (b) => ({ ...b, columns: nextColumns })) })
      try {
        await structureApi.reorderColumns(boardId, columnIds)
      } catch {
        await rollbackBoards(snapshot, 'structureApp.errorReorderColumns')
      }
    },

    async createCard(columnId, data) {
      try {
        const card = await structureApi.createCard(columnId, data)
        set({
          boards: patchColumnInBoards(get().boards, columnId, (column) => ({
            ...column,
            cards: [...(column.cards ?? []), card],
          })),
        })
        return card
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async updateCard(id, data) {
      try {
        const card = await structureApi.updateCard(id, data)
        set({
          boards: get().boards.map((board) => ({
            ...board,
            columns: (board.columns ?? []).map((column) => ({
              ...column,
              cards: (column.cards ?? []).map((item) => (item.id === id ? card : item)),
            })),
          })),
        })
        return card
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async removeCard(id) {
      try {
        await structureApi.deleteCard(id)
        set({
          boards: get().boards.map((board) => ({
            ...board,
            columns: (board.columns ?? []).map((column) => ({
              ...column,
              cards: (column.cards ?? []).filter((item) => item.id !== id),
            })),
          })),
        })
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    async moveCard(cardId, toColumnId, toIndex) {
      const snapshot = get().boards
      const next = applyCardMove(snapshot, cardId, toColumnId, toIndex)
      if (!next) return
      set({ boards: next })
      try {
        await structureApi.moveCard(cardId, toColumnId, toIndex)
      } catch {
        await rollbackBoards(snapshot, 'structureApp.errorMoveCard')
      }
    },

    async syncChapters(boardId) {
      try {
        const { created, board } = await structureApi.syncChapters(boardId)
        set({
          boards: get().boards.map((item) => (item.id === boardId ? board : item)),
        })
        if (created > 0) useToastStore.getState().success(i18n.t('structureApp.syncSuccess', { count: created }))
        return created
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return 0
      }
    },

    async loadSubplots(projectId) {
      set({ isLoadingSubplots: true, projectId })
      try {
        const subplots = await subplotsApi.list(projectId)
        set({ subplots, isLoadingSubplots: false })
      } catch (err: unknown) {
        set({ isLoadingSubplots: false })
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    async createSubplot(projectId, data) {
      try {
        const subplot = await subplotsApi.create(projectId, data)
        set({ subplots: [...get().subplots, subplot] })
        return subplot
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async updateSubplot(id, data) {
      try {
        const subplot = await subplotsApi.update(id, data)
        set({ subplots: get().subplots.map((item) => (item.id === id ? subplot : item)) })
        return subplot
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
        return null
      }
    },

    async removeSubplot(id) {
      try {
        await subplotsApi.delete(id)
        set({ subplots: get().subplots.filter((item) => item.id !== id) })
      } catch (err: unknown) {
        useToastStore.getState().error(getErrorMessage(err))
      }
    },

    async reorderSubplots(projectId, subplotIds) {
      const snapshot = get().subplots
      const byId = new Map(snapshot.map((subplot) => [subplot.id, subplot]))
      const ordered = subplotIds
        .map((id) => byId.get(id))
        .filter((subplot): subplot is Subplot => Boolean(subplot))
      const remaining = snapshot.filter((subplot) => !subplotIds.includes(subplot.id))
      const next = [...ordered, ...remaining].map((subplot, index) => ({ ...subplot, order: index }))
      set({ subplots: next })
      try {
        const subplots = await subplotsApi.reorder(projectId, subplotIds)
        set({ subplots })
      } catch {
        set({ subplots: snapshot })
        useToastStore.getState().error(i18n.t('structureApp.errorReorderSubplots'))
        await get().loadSubplots(projectId)
      }
    },
  }
})
