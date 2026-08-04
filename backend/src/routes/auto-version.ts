import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { autoVersionService, type AutoVersionTrigger } from '../services/auto-version-service.js'

const VALID_TRIGGERS: AutoVersionTrigger[] = ['inactivity', 'exit', 'hourly', 'daily', 'weekly', 'monthly']

export async function autoVersionRoutes(app: FastifyInstance) {
  app.post('/auto-version/check/:documentId', {
    schema: {
      description: 'Check and create an auto-version snapshot for a document. Optionally targets a branch via branchId.',
      tags: ['Auto-Version'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
        required: ['documentId'],
      },
      body: {
        type: 'object',
        properties: {
          trigger: { type: 'string', enum: ['inactivity', 'exit', 'hourly', 'daily', 'weekly', 'monthly'] },
          lastActivityAt: { type: 'string' },
          branchId: { type: 'string', description: 'Rama donde crear el snapshot (por defecto: main)' },
        },
        required: ['trigger'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    const body = request.body as { trigger?: string; lastActivityAt?: string; branchId?: string }

    if (!body.trigger || !VALID_TRIGGERS.includes(body.trigger as AutoVersionTrigger)) {
      return reply.status(400).send({
        error: { code: 'INVALID_TRIGGER', message: `Trigger inválido. Válidos: ${VALID_TRIGGERS.join(', ')}` },
      })
    }

    const result = await autoVersionService.checkAndCreate(
      documentId,
      user.id,
      body.trigger as AutoVersionTrigger,
      body.lastActivityAt,
      body.branchId,
    )

    return result
  })

  app.patch('/documents/:documentId/activity', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    const body = request.body as { lastActivityAt?: string }

    if (!body.lastActivityAt) {
      return reply.status(400).send({
        error: { code: 'MISSING_FIELD', message: 'lastActivityAt es requerido' },
      })
    }

    await autoVersionService.updateActivity(documentId, user.id, body.lastActivityAt)
    return { ok: true }
  })
}
