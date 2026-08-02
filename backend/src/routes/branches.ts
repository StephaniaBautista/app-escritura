import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@generated/client'
import { getSessionUser } from '../lib/session.js'
import { branchService } from '../services/branch-service.js'
import { mergeService } from '../services/merge-service.js'

export async function branchRoutes(app: FastifyInstance) {
  app.get('/documents/:documentId/branches', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { documentId } = request.params as { documentId: string }
    return branchService.list(documentId, user.id)
  })

  app.post('/documents/:documentId/branches', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { documentId } = request.params as { documentId: string }
    const body = request.body as { name?: string; sourceVersionId?: string }

    if (!body.name) {
      return reply.status(400).send({ error: { code: 'MISSING_FIELD', message: 'name es requerido' } })
    }

    const branch = await branchService.create(documentId, user.id, body.name, body.sourceVersionId)
    if (!branch) {
      return reply.status(400).send({ error: { code: 'CREATE_FAILED', message: 'No se pudo crear la rama (nombre duplicado o versión inválida)' } })
    }
    return reply.status(201).send(branch)
  })

  app.get('/documents/:documentId/branches/graph', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { documentId } = request.params as { documentId: string }
    return branchService.getGraph(documentId, user.id)
  })

  app.get('/branches/:branchId', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { branchId } = request.params as { branchId: string }
    const branch = await branchService.get(branchId, user.id)
    if (!branch) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rama no encontrada' } })
    return branch
  })

  app.patch('/branches/:branchId', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { branchId } = request.params as { branchId: string }
    const body = request.body as { name?: string }

    if (!body.name) {
      return reply.status(400).send({ error: { code: 'MISSING_FIELD', message: 'name es requerido' } })
    }

    const branch = await branchService.rename(branchId, user.id, body.name)
    if (!branch) {
      return reply.status(400).send({ error: { code: 'RENAME_FAILED', message: 'No se pudo renombrar (main no se renombra o nombre duplicado)' } })
    }
    return branch
  })

  app.post('/branches/:branchId/merge', {
    schema: {
      description: 'Merge a branch into a target branch. Creates a merge commit (version with two parents) when there are no conflicts or when a resolution is provided. Returns 409 with the conflict list when resolution is required.',
      tags: ['Branches'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
        required: ['branchId'],
      },
      body: {
        type: 'object',
        properties: {
          targetBranchId: { type: 'string' },
          resolution: {
            type: 'object',
            properties: {
              content: {},
            },
          },
        },
        required: ['targetBranchId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { branchId } = request.params as { branchId: string }
    const body = request.body as { targetBranchId?: string; resolution?: { content?: unknown } }

    if (!body.targetBranchId) {
      return reply.status(400).send({ error: { code: 'MISSING_FIELD', message: 'targetBranchId es requerido' } })
    }

    const result = await mergeService.merge(branchId, body.targetBranchId, user.id, body.resolution as { content?: Prisma.JsonValue } | undefined)
    if (!result) {
      return reply.status(400).send({ error: { code: 'MERGE_FAILED', message: 'No se pudo fusionar (mismas ramas o rama no encontrada)' } })
    }
    if (!result.merged) {
      return reply.status(409).send(result)
    }
    return reply.status(201).send(result)
  })

  app.delete('/branches/:branchId', async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    const { branchId } = request.params as { branchId: string }
    const deleted = await branchService.delete(branchId, user.id)
    if (!deleted) {
      return reply.status(400).send({ error: { code: 'DELETE_FAILED', message: 'No se pudo eliminar (main no se elimina)' } })
    }
    return { ok: true }
  })
}
