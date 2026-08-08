import type { FastifyInstance } from 'fastify'
import { getSessionUser, requirePermission } from '../lib/session.js'
import { optionsService, type OptionType } from '../services/options-service.js'

const VALID_TYPES: OptionType[] = ['rating', 'storyType', 'category', 'narrator', 'ending', 'fandom', 'tag', 'problem', 'ship', 'character']

export async function optionsRoutes(app: FastifyInstance) {
  app.get('/story-options', {
    schema: {
      description: 'List global story options for a given type',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: VALID_TYPES },
          fandoms: { type: 'string', description: 'Fandoms (separados por coma) para filtrar ships/characters' },
        },
        required: ['type'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { type, fandoms } = request.query as { type: string; fandoms?: string }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` } })
    }

    const opts = fandoms === undefined
      ? undefined
      : { fandoms: fandoms.split(',').map((f) => f.trim()).filter(Boolean) }
    return optionsService.list(type as OptionType, opts)
  })

  app.get('/story-options/all', {
    schema: {
      description: 'List all global story options grouped by type',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return optionsService.listAll()
  })

  app.post('/story-options', {
    schema: {
      description: 'Create a global story option',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: VALID_TYPES },
          value: { type: 'string', minLength: 1, maxLength: 200 },
          label: { type: 'string', minLength: 1, maxLength: 200 },
          fandoms: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 20 },
        },
        required: ['type', 'value', 'label'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { type, value, label, fandoms } = request.body as { type: string; value: string; label: string; fandoms?: string[] }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Tipo inválido' } })
    }

    const option = await optionsService.create(type as OptionType, value.trim(), label.trim(), fandoms)

    return reply.status(201).send(option)
  })

  app.delete('/story-options/:id', {
    schema: {
      description: 'Delete a global story option (superadmin only)',
      tags: ['Story Options'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const deleted = await optionsService.delete(id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Opción no encontrada o es un default' } })

    return { ok: true }
  })
}
