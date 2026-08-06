import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { activityService, type ActivityType } from '../services/activity-service.js'

const VALID_TYPES: ActivityType[] = ['folder_created', 'document_created', 'document_edited']

export async function activityRoutes(app: FastifyInstance) {
  app.get('/activity', {
    schema: {
      description: 'List recent activity for the authenticated user (newest first, max 20)',
      tags: ['Activity'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return activityService.list(user.id)
  })

  app.post('/activity', {
    schema: {
      description: 'Create an activity entry (folder_created, document_created, document_edited)',
      tags: ['Activity'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          type: { type: 'string', enum: VALID_TYPES },
          title: { type: 'string', minLength: 1, maxLength: 500 },
          folderId: { type: 'string' },
          documentId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const body = request.body as { type?: string; title?: string; folderId?: string; documentId?: string }
    if (!body.type || !VALID_TYPES.includes(body.type as ActivityType) || !body.title) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'type y title son requeridos' } })
    }

    const activity = await activityService.create(user.id, {
      type: body.type as ActivityType,
      title: body.title,
      folderId: body.folderId,
      documentId: body.documentId,
    })
    return reply.status(201).send(activity)
  })

  app.delete('/activity/document/:documentId', {
    schema: {
      description: 'Remove all activity entries pointing to a document',
      tags: ['Activity'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
        required: ['documentId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    await activityService.removeByDocument(documentId, user.id)
    return { ok: true }
  })

  app.delete('/activity/folder/:folderId', {
    schema: {
      description: 'Remove all activity entries pointing to a folder/project',
      tags: ['Activity'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { folderId: { type: 'string' } },
        required: ['folderId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { folderId } = request.params as { folderId: string }
    await activityService.removeByFolder(folderId, user.id)
    return { ok: true }
  })
}
