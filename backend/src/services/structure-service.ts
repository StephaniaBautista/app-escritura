import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'
import { resolveSubplotId } from '../lib/subplot-link.js'

export const CARD_TYPES = ['scene', 'chapter', 'character', 'document', 'note'] as const
export type CardType = typeof CARD_TYPES[number]

const DEFAULT_BOARD_NAME = 'Estructura'
const DEFAULT_COLUMNS = ['Inicio', 'Desarrollo', 'Climax', 'Conclusión']

const boardInclude = {
  columns: {
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { cards: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
  },
} satisfies Prisma.StructureBoardInclude

export interface BoardInput {
  name?: string
  order?: number
}

export interface ColumnInput {
  name?: string
  color?: string | null
  order?: number
}

export interface CardInput {
  title?: string
  description?: string | null
  cardType?: string
  referenceId?: string | null
  color?: string | null
  subplotId?: string | null
  order?: number
}

export interface MoveCardInput {
  toColumnId?: string
  toIndex?: number
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

function normalizeCardType(cardType: string | undefined): CardType {
  return CARD_TYPES.includes(cardType as CardType) ? cardType as CardType : 'scene'
}

export const structureService = {
  async listBoards(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const boards = await prisma.structureBoard.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: boardInclude,
    })
    if (boards.length > 0) return boards
    const board = await prisma.structureBoard.create({
      data: {
        projectId,
        name: DEFAULT_BOARD_NAME,
        columns: {
          create: DEFAULT_COLUMNS.map((name, index) => ({ name, order: index })),
        },
      },
      include: boardInclude,
    })
    return [board]
  },

  async createBoard(projectId: string, userId: string, data: BoardInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const order = data.order ?? (await prisma.structureBoard.count({ where: { projectId } }))
    return prisma.structureBoard.create({
      data: { projectId, name: data.name ?? '', order },
      include: boardInclude,
    })
  },

  async updateBoard(id: string, userId: string, data: BoardInput) {
    const board = await prisma.structureBoard.findFirst({ where: { id, project: { userId } } })
    if (!board) return null
    return prisma.structureBoard.update({
      where: { id },
      data: { name: data.name, order: data.order },
      include: boardInclude,
    })
  },

  async removeBoard(id: string, userId: string) {
    const board = await prisma.structureBoard.findFirst({ where: { id, project: { userId } } })
    if (!board) return false
    await prisma.structureBoard.delete({ where: { id } })
    return true
  },

  async createColumn(boardId: string, userId: string, data: ColumnInput) {
    const board = await prisma.structureBoard.findFirst({ where: { id: boardId, project: { userId } } })
    if (!board) return null
    const order = data.order ?? (await prisma.structureColumn.count({ where: { boardId } }))
    return prisma.structureColumn.create({
      data: { boardId, name: data.name ?? '', color: data.color ?? null, order },
    })
  },

  async updateColumn(id: string, userId: string, data: ColumnInput) {
    const column = await prisma.structureColumn.findFirst({ where: { id, board: { project: { userId } } } })
    if (!column) return null
    return prisma.structureColumn.update({
      where: { id },
      data: { name: data.name, color: data.color, order: data.order },
    })
  },

  async removeColumn(id: string, userId: string) {
    const column = await prisma.structureColumn.findFirst({ where: { id, board: { project: { userId } } } })
    if (!column) return false
    await prisma.structureColumn.delete({ where: { id } })
    return true
  },

  async reorderColumns(boardId: string, userId: string, columnIds: string[]) {
    const board = await prisma.structureBoard.findFirst({
      where: { id: boardId, project: { userId } },
      include: { columns: true },
    })
    if (!board) return null
    const validIds = new Set(board.columns.map((column) => column.id))
    const updates = columnIds
      .filter((columnId) => validIds.has(columnId))
      .map((columnId, index) =>
        prisma.structureColumn.update({ where: { id: columnId }, data: { order: index } }),
      )
    await prisma.$transaction(updates)
    return prisma.structureColumn.findMany({
      where: { boardId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async createCard(columnId: string, userId: string, data: CardInput) {
    const column = await prisma.structureColumn.findFirst({
      where: { id: columnId, board: { project: { userId } } },
      include: { board: { select: { projectId: true } } },
    })
    if (!column) return null
    const subplotId = await resolveSubplotId(column.board.projectId, data.subplotId)
    const order = data.order ?? (await prisma.structureCard.count({ where: { columnId } }))
    return prisma.structureCard.create({
      data: {
        columnId,
        title: data.title ?? '',
        description: data.description ?? null,
        cardType: normalizeCardType(data.cardType),
        referenceId: data.referenceId ?? null,
        color: data.color ?? null,
        subplotId: subplotId ?? null,
        order,
      },
    })
  },

  async updateCard(id: string, userId: string, data: CardInput) {
    const card = await prisma.structureCard.findFirst({
      where: { id, column: { board: { project: { userId } } } },
      include: { column: { select: { board: { select: { projectId: true } } } } },
    })
    if (!card) return null
    const subplotId = await resolveSubplotId(card.column.board.projectId, data.subplotId)
    return prisma.structureCard.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        cardType: data.cardType === undefined ? undefined : normalizeCardType(data.cardType),
        referenceId: data.referenceId,
        color: data.color,
        subplotId,
        order: data.order,
      },
    })
  },

  async removeCard(id: string, userId: string) {
    const card = await prisma.structureCard.findFirst({ where: { id, column: { board: { project: { userId } } } } })
    if (!card) return false
    await prisma.structureCard.delete({ where: { id } })
    return true
  },

  async reorderCards(columnId: string, userId: string, cardIds: string[]) {
    const column = await prisma.structureColumn.findFirst({
      where: { id: columnId, board: { project: { userId } } },
      include: { cards: true },
    })
    if (!column) return null
    const validIds = new Set(column.cards.map((card) => card.id))
    const updates = cardIds
      .filter((cardId) => validIds.has(cardId))
      .map((cardId, index) =>
        prisma.structureCard.update({ where: { id: cardId }, data: { order: index } }),
      )
    await prisma.$transaction(updates)
    return prisma.structureCard.findMany({
      where: { columnId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async syncChaptersFromDocuments(boardId: string, userId: string) {
    const board = await prisma.structureBoard.findFirst({
      where: { id: boardId, project: { userId } },
      include: boardInclude,
    })
    if (!board) return null
    const columns = board.columns ?? []
    const targetColumn = columns[0]
    if (!targetColumn) return { created: 0, board }
    const chapters = await prisma.document.findMany({
      where: { projectId: board.projectId, userId, type: 'chapter' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true },
    })
    const linked = new Set(
      columns.flatMap((column) =>
        (column.cards ?? []).map((card) => card.referenceId).filter((referenceId): referenceId is string => Boolean(referenceId)),
      ),
    )
    const missing = chapters.filter((chapter) => !linked.has(chapter.id))
    if (!missing.length) {
      return { created: 0, board }
    }
    const baseOrder = await prisma.structureCard.count({ where: { columnId: targetColumn.id } })
    await prisma.$transaction(
      missing.map((chapter, index) =>
        prisma.structureCard.create({
          data: {
            columnId: targetColumn.id,
            title: chapter.title,
            cardType: 'chapter',
            referenceId: chapter.id,
            order: baseOrder + index,
          },
        }),
      ),
    )
    const refreshed = await prisma.structureBoard.findFirst({
      where: { id: boardId },
      include: boardInclude,
    })
    return { created: missing.length, board: refreshed ?? board }
  },

  async moveCard(id: string, userId: string, data: MoveCardInput) {
    if (!data.toColumnId || data.toIndex === undefined) return null
    const card = await prisma.structureCard.findFirst({ where: { id, column: { board: { project: { userId } } } } })
    if (!card) return null
    const targetColumn = await prisma.structureColumn.findFirst({
      where: { id: data.toColumnId, board: { project: { userId } } },
      include: { cards: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
    })
    if (!targetColumn) return null
    const siblings = targetColumn.cards.filter((targetCard) => targetCard.id !== id)
    const toIndex = Math.max(0, Math.min(data.toIndex, siblings.length))
    siblings.splice(toIndex, 0, card)
    const updates = siblings.map((sibling, index) =>
      prisma.structureCard.update({ where: { id: sibling.id }, data: { order: index, columnId: targetColumn.id } }),
    )
    if (card.columnId !== targetColumn.id) {
      const sourceCards = await prisma.structureCard.findMany({
        where: { columnId: card.columnId, id: { not: id } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
      updates.push(
        ...sourceCards.map((sourceCard, index) =>
          prisma.structureCard.update({ where: { id: sourceCard.id }, data: { order: index } }),
        ),
      )
    }
    await prisma.$transaction(updates)
    return prisma.structureCard.findUnique({ where: { id } })
  },
}
