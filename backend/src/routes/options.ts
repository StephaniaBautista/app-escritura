import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { optionsService, type OptionType } from '../services/options-service.js'

const VALID_TYPES: OptionType[] = ['rating', 'storyType', 'category', 'narrator', 'ending', 'fandom', 'tag', 'problem', 'ship', 'character']

export async function optionsRoutes(app: FastifyInstance) {
  app.get('/story-options', {
    schema: {
      description: 'List story options (defaults + user custom) for a given type',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: VALID_TYPES },
        },
        required: ['type'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { type } = request.query as { type: string }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` } })
    }

    return optionsService.list(type as OptionType, user.id)
  })

  app.get('/story-options/all', {
    schema: {
      description: 'List all story options (defaults + user custom) grouped by type',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return optionsService.listAll(user.id)
  })

  app.post('/story-options', {
    schema: {
      description: 'Create a user-custom story option',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: VALID_TYPES },
          value: { type: 'string', minLength: 1, maxLength: 200 },
          label: { type: 'string', minLength: 1, maxLength: 200 },
        },
        required: ['type', 'value', 'label'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { type, value, label } = request.body as { type: string; value: string; label: string }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Tipo inválido' } })
    }

    const option = await optionsService.create(user.id, type as OptionType, value.trim(), label.trim())
    if (!option) return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: 'No se pudo crear la opción' } })

    return reply.status(201).send(option)
  })

  app.delete('/story-options/:id', {
    schema: {
      description: 'Delete a user-custom story option (defaults cannot be deleted)',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const deleted = await optionsService.delete(id, user.id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Opción no encontrada o es un default' } })

    return { ok: true }
  })
}
