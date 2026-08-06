import type { FastifyInstance } from 'fastify'
import { requireSuperadmin } from '../lib/session.js'
import { optionsService, type OptionType } from '../services/options-service.js'

const VALID_TYPES: OptionType[] = ['rating', 'storyType', 'category', 'narrator', 'ending', 'fandom', 'tag', 'problem', 'ship', 'character']

export async function adminOptionsRoutes(app: FastifyInstance) {
  app.get('/admin/story-options/groups', {
    schema: {
      description: 'List global story options grouped by text similarity (superadmin)',
      tags: ['Admin'],
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
    const user = await requireSuperadmin(request, reply)
    if (!user) return

    const { type } = request.query as { type: string }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Tipo inválido' } })
    }

    const groups = await optionsService.groups(type as OptionType)
    return { groups }
  })

  app.delete('/admin/story-options/:id', {
    schema: {
      description: 'Delete a global story option (superadmin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await requireSuperadmin(request, reply)
    if (!user) return

    const { id } = request.params as { id: string }
    const deleted = await optionsService.delete(id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Opción no encontrada o es un default' } })

    return { ok: true }
  })
}
