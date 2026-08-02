import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { settingsService } from '../services/settings-service.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    return settingsService.get(user.id)
  })

  app.patch('/settings', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const body = request.body as Record<string, unknown>
    return settingsService.update(user.id, body as { theme?: string; language?: string; autoVersion?: Record<string, unknown> })
  })
}
