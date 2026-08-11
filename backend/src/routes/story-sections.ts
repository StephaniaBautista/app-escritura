import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { storySectionService } from '../services/story-section-service.js'

export async function storySectionsRoutes(app: FastifyInstance) {
  app.get('/story-sections', {
    schema: {
      description: 'List standard story structure sections (inicio, desarrollo, climax, final), read-only catalog',
      tags: ['Story Sections'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return storySectionService.list()
  })
}
