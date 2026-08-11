import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  relationshipService,
  RelationshipExistsError,
  RelationshipNotFoundError,
  RELATIONSHIP_TYPES,
  type RelationshipInput,
} from '../services/relationship-service.js'

const relationshipBodySchema = {
  type: 'object',
  properties: {
    characterAId: { type: 'string', minLength: 1 },
    characterBId: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: [...RELATIONSHIP_TYPES] },
    label: { type: ['string', 'null'], maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 2000 },
  },
} as const

const paramsIdSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const

const paramsProjectSchema = {
  type: 'object',
  properties: { projectId: { type: 'string' } },
  required: ['projectId'],
} as const

const auth = [{ cookieAuth: [] }]

export async function relationshipRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/relationships', {
    schema: {
      description: 'List character relationships of a project (optional ?type= filter)',
      tags: ['Relationships'],
      security: auth,
      params: paramsProjectSchema,
      querystring: {
        type: 'object',
        properties: { type: { type: 'string', enum: [...RELATIONSHIP_TYPES] } },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const { type } = request.query as { type?: string }
      const rels = await relationshipService.listByProject(projectId, user.id, type)
      if (!rels) return reply.code(404).send({ error: 'NOT_FOUND' })
      return rels
    },
  })

  app.post('/projects/:projectId/relationships', {
    schema: {
      description: 'Create a character relationship (pair normalized, 409 if exists)',
      tags: ['Relationships'],
      security: auth,
      params: paramsProjectSchema,
      body: relationshipBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      try {
        const rel = await relationshipService.create(projectId, user.id, request.body as RelationshipInput)
        if (!rel) return reply.code(404).send({ error: 'NOT_FOUND' })
        return reply.code(201).send(rel)
      } catch (err) {
        if (err instanceof RelationshipExistsError) {
          return reply.code(409).send({ error: 'RELATIONSHIP_EXISTS' })
        }
        if (err instanceof RelationshipNotFoundError) {
          return reply.code(400).send({ error: 'INVALID_CHARACTERS' })
        }
        throw err
      }
    },
  })

  app.put('/relationships/:id', {
    schema: {
      description: 'Update a character relationship',
      tags: ['Relationships'],
      security: auth,
      params: paramsIdSchema,
      body: relationshipBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      try {
        const rel = await relationshipService.update(id, user.id, request.body as RelationshipInput)
        return rel
      } catch (err) {
        if (err instanceof RelationshipExistsError) {
          return reply.code(409).send({ error: 'RELATIONSHIP_EXISTS' })
        }
        if (err instanceof RelationshipNotFoundError) {
          return reply.code(404).send({ error: 'NOT_FOUND' })
        }
        throw err
      }
    },
  })

  app.delete('/relationships/:id', {
    schema: {
      description: 'Delete a character relationship',
      tags: ['Relationships'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      try {
        await relationshipService.remove(id, user.id)
        return reply.code(204).send()
      } catch (err) {
        if (err instanceof RelationshipNotFoundError) {
          return reply.code(404).send({ error: 'NOT_FOUND' })
        }
        throw err
      }
    },
  })
}
