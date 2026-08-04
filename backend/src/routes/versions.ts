import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { versionService } from '../services/version-service.js'

export async function versionRoutes(app: FastifyInstance) {
  app.get('/documents/:documentId/versions', {
    schema: {
      description: 'List versions (snapshots) for a document, newest first. Optionally filter by branchId query param.',
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
    const { branchId } = request.query as { branchId?: string }
    return versionService.list(documentId, user.id, branchId)
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
      body: {
        type: 'object',
        properties: {
          branchId: { type: 'string', description: 'Rama donde crear la versión (por defecto: main)' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    const body = request.body as { branchId?: string } | undefined
    const version = await versionService.create(documentId, user.id, undefined, body?.branchId)
    if (!version) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return reply.status(201).send(version)
  })

  app.get('/branches/:branchId/versions', {
    schema: {
      description: 'List versions for a specific branch, newest first',
      tags: ['Versions'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
        required: ['branchId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { branchId } = request.params as { branchId: string }
    const branch = await (await import('../services/branch-service.js')).branchService.get(branchId, user.id)
    if (!branch) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rama no encontrada' } })

    return versionService.list(branch.documentId, user.id, branchId)
  })

  app.post('/branches/:branchId/versions', {
    schema: {
      description: 'Create a version in a specific branch',
      tags: ['Versions'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
        required: ['branchId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { branchId } = request.params as { branchId: string }
    const branch = await (await import('../services/branch-service.js')).branchService.get(branchId, user.id)
    if (!branch) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rama no encontrada' } })

    const version = await versionService.create(branch.documentId, user.id, undefined, branchId)
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
