import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { replySubplotError } from '../lib/subplot-errors.js'
import {
  structureService,
  type BoardInput,
  type ColumnInput,
  type CardInput,
  type MoveCardInput,
} from '../services/structure-service.js'

const paramsIdSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const

const paramsProjectSchema = {
  type: 'object',
  properties: { projectId: { type: 'string' } },
  required: ['projectId'],
} as const

const paramsBoardSchema = {
  type: 'object',
  properties: { boardId: { type: 'string' } },
  required: ['boardId'],
} as const

const paramsColumnSchema = {
  type: 'object',
  properties: { columnId: { type: 'string' } },
  required: ['columnId'],
} as const

const boardBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
  },
} as const

const columnBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    color: { type: ['string', 'null'], maxLength: 50 },
    order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
  },
} as const

const cardProperties = {
  title: { type: 'string', minLength: 1, maxLength: 500 },
  description: { type: ['string', 'null'], maxLength: 10000 },
  cardType: { type: 'string', enum: ['scene', 'chapter', 'character', 'document', 'note'] },
  referenceId: { type: ['string', 'null'], maxLength: 100 },
  color: { type: ['string', 'null'], maxLength: 50 },
  subplotId: { type: ['string', 'null'], maxLength: 100 },
  order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
} as const

const cardCreateBodySchema = {
  type: 'object',
  properties: cardProperties,
  required: ['title'],
} as const

const cardUpdateBodySchema = {
  type: 'object',
  properties: cardProperties,
} as const

const reorderColumnsBodySchema = {
  type: 'object',
  properties: {
    columnIds: { type: 'array', items: { type: 'string' }, maxItems: 1000 },
  },
  required: ['columnIds'],
} as const

const reorderCardsBodySchema = {
  type: 'object',
  properties: {
    cardIds: { type: 'array', items: { type: 'string' }, maxItems: 1000 },
  },
  required: ['cardIds'],
} as const

const moveCardBodySchema = {
  type: 'object',
  properties: {
    toColumnId: { type: 'string', minLength: 1 },
    toIndex: { type: 'integer', minimum: 0, maximum: 100000 },
  },
  required: ['toColumnId', 'toIndex'],
} as const

const auth = [{ cookieAuth: [] }]

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

export async function structureRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/boards', {
    schema: {
      description: 'List structure boards of a project (creates a default board if none)',
      tags: ['Structure'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const boards = await structureService.listBoards(projectId, user.id)
      if (!boards) return notFound(reply)
      return boards
    },
  })

  app.post('/projects/:projectId/boards', {
    schema: {
      description: 'Create a structure board',
      tags: ['Structure'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        properties: boardBodySchema.properties,
        required: ['name'],
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const board = await structureService.createBoard(projectId, user.id, request.body as BoardInput)
      if (!board) return notFound(reply)
      return reply.code(201).send(board)
    },
  })

  app.put('/boards/:id', {
    schema: {
      description: 'Update a structure board',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
      body: boardBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const board = await structureService.updateBoard(id, user.id, request.body as BoardInput)
      if (!board) return notFound(reply)
      return board
    },
  })

  app.delete('/boards/:id', {
    schema: {
      description: 'Delete a structure board',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await structureService.removeBoard(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  app.post('/boards/:boardId/columns', {
    schema: {
      description: 'Create a column in a board',
      tags: ['Structure'],
      security: auth,
      params: paramsBoardSchema,
      body: {
        type: 'object',
        properties: columnBodySchema.properties,
        required: ['name'],
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { boardId } = request.params as { boardId: string }
      const column = await structureService.createColumn(boardId, user.id, request.body as ColumnInput)
      if (!column) return notFound(reply)
      return reply.code(201).send(column)
    },
  })

  app.put('/columns/:id', {
    schema: {
      description: 'Update a column',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
      body: columnBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const column = await structureService.updateColumn(id, user.id, request.body as ColumnInput)
      if (!column) return notFound(reply)
      return column
    },
  })

  app.delete('/columns/:id', {
    schema: {
      description: 'Delete a column',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await structureService.removeColumn(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  app.put('/boards/:boardId/columns/reorder', {
    schema: {
      description: 'Reorder the columns of a board',
      tags: ['Structure'],
      security: auth,
      params: paramsBoardSchema,
      body: reorderColumnsBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { boardId } = request.params as { boardId: string }
      const { columnIds } = request.body as { columnIds: string[] }
      const columns = await structureService.reorderColumns(boardId, user.id, columnIds)
      if (!columns) return notFound(reply)
      return columns
    },
  })

  app.post('/columns/:columnId/cards', {
    schema: {
      description: 'Create a card in a column. `subplotId` links the card to a subplot of the same project (400 SUBPLOT_NOT_IN_PROJECT otherwise); null clears it.',
      tags: ['Structure'],
      security: auth,
      params: paramsColumnSchema,
      body: cardCreateBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { columnId } = request.params as { columnId: string }
      try {
        const card = await structureService.createCard(columnId, user.id, request.body as CardInput)
        if (!card) return notFound(reply)
        return reply.code(201).send(card)
      } catch (err: unknown) {
        return replySubplotError(reply, err)
      }
    },
  })

  app.put('/cards/:id', {
    schema: {
      description: 'Update a card. `subplotId` links the card to a subplot of the same project (400 SUBPLOT_NOT_IN_PROJECT otherwise); null clears it.',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
      body: cardUpdateBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      try {
        const card = await structureService.updateCard(id, user.id, request.body as CardInput)
        if (!card) return notFound(reply)
        return card
      } catch (err: unknown) {
        return replySubplotError(reply, err)
      }
    },
  })

  app.delete('/cards/:id', {
    schema: {
      description: 'Delete a card',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await structureService.removeCard(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  app.put('/columns/:columnId/cards/reorder', {
    schema: {
      description: 'Reorder the cards of a column',
      tags: ['Structure'],
      security: auth,
      params: paramsColumnSchema,
      body: reorderCardsBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { columnId } = request.params as { columnId: string }
      const { cardIds } = request.body as { cardIds: string[] }
      const cards = await structureService.reorderCards(columnId, user.id, cardIds)
      if (!cards) return notFound(reply)
      return cards
    },
  })

  app.post('/boards/:boardId/sync-chapters', {
    schema: {
      description: 'Create board cards for project chapters not yet linked on the board',
      tags: ['Structure'],
      security: auth,
      params: paramsBoardSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            created: { type: 'integer', minimum: 0 },
            board: { type: 'object' },
          },
          required: ['created', 'board'],
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { boardId } = request.params as { boardId: string }
      const result = await structureService.syncChaptersFromDocuments(boardId, user.id)
      if (!result) return notFound(reply)
      return result
    },
  })

  app.put('/cards/:id/move', {
    schema: {
      description: 'Move a card to another column (or position within it)',
      tags: ['Structure'],
      security: auth,
      params: paramsIdSchema,
      body: moveCardBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const card = await structureService.moveCard(id, user.id, request.body as MoveCardInput)
      if (!card) return notFound(reply)
      return card
    },
  })
}
