import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { characterOptionService, CHARACTER_OPTION_TYPES, type CharacterOptionType } from '../services/character-option-service.js'

export async function characterOptionsRoutes(app: FastifyInstance) {
  app.get('/character-options', {
    schema: {
      description: 'List character form options (gender, orientation, maritalStatus, role), read-only catalog',
      tags: ['Character Options'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: CHARACTER_OPTION_TYPES },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { type } = request.query as { type?: string }
    if (type === undefined) return characterOptionService.listGrouped()

    if (!CHARACTER_OPTION_TYPES.includes(type as CharacterOptionType)) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Tipo inválido' } })
    }
    return characterOptionService.listByType(type as CharacterOptionType)
  })
}
