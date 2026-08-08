import type { FastifyInstance } from 'fastify'
import { requirePermission } from '../lib/session.js'
import { optionsService, type OptionType } from '../services/options-service.js'

const VALID_TYPES: OptionType[] = ['rating', 'storyType', 'category', 'narrator', 'ending', 'fandom', 'tag', 'problem', 'ship', 'character']

export async function adminOptionsRoutes(app: FastifyInstance) {
  app.get('/admin/story-options/tree', {
    schema: {
      description: 'List fandoms with their children (ships/characters) grouped by type (moderate)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    return optionsService.listByFandom()
  })

  app.get('/admin/story-options/groups', {
    schema: {
      description: 'List global story options grouped by text similarity (moderate)',
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
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { type } = request.query as { type: string }
    if (!VALID_TYPES.includes(type as OptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Tipo inválido' } })
    }

    const groups = await optionsService.groups(type as OptionType)
    return { groups }
  })

  app.patch('/admin/story-options/:id/fandom', {
    schema: {
      description: 'Move an option (ship/character) to a fandom, replacing its fandoms (moderate)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          fandom: { type: 'string', minLength: 1, maxLength: 200 },
        },
        required: ['fandom'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const { fandom } = request.body as { fandom: string }

    const result = await optionsService.moveFandom(id, fandom.trim())
    if (!result.ok) {
      const message = {
        'not-found': 'Opción no encontrada',
        'is-default': 'No se puede mover una opción por defecto',
        'invalid-type': 'Solo ships y personajes pueden tener fandom',
        'invalid-fandom': 'El fandom destino no existe',
      }[result.reason]
      return reply.status(400).send({ error: { code: 'MOVE_FAILED', message } })
    }

    return { ok: true }
  })

  app.delete('/admin/story-options/:id', {
    schema: {
      description: 'Delete a global story option; a fandom with children cannot be deleted (moderate)',
      tags: ['Admin'],
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
    const option = await optionsService.findById(id)
    if (!option || option.isDefault) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Opción no encontrada o es un default' } })
    }
    if (option.type === 'fandom') {
      const hasChildren = await optionsService.hasFandomChildren(option.value)
      if (hasChildren) {
        return reply.status(409).send({ error: { code: 'HAS_CHILDREN', message: 'Mueve primero sus ships y personajes' } })
      }
    }

    const deleted = await optionsService.delete(id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Opción no encontrada o es un default' } })

    return { ok: true }
  })
}
