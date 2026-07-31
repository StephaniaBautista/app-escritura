import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { versionService } from '../services/version-service.js'

export async function versionRoutes(app: FastifyInstance) {
  app.get('/documents/:documentId/versions', {
    schema: {
      description: 'List versions (snapshots) for a document, newest first',
      tags: ['Versions'],
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
    return versionService.list(documentId, user.id)
  })

  app.post('/documents/:documentId/versions', {
    schema: {
      description: 'Create a version (snapshot) of the current document state',
      tags: ['Versions'],
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
    const version = await versionService.create(documentId, user.id)
    if (!version) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return reply.status(201).send(version)
  })

  app.get('/versions/:id', {
    schema: {
      description: 'Get a specific version with its full snapshot content',
      tags: ['Versions'],
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
    const version = await versionService.get(id, user.id)
    if (!version) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Versión no encontrada' } })

    return version
  })

  app.post('/versions/:id/restore', {
    schema: {
      description: 'Restore a version, overwriting the current document title and content',
      tags: ['Versions'],
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
    const doc = await versionService.restore(id, user.id)
    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Versión o documento no encontrado' } })

    return doc
  })
}
