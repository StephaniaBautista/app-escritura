import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { tagsService, TAG_KINDS, type TagKind } from '../services/tags-service.js'

const paramsProjectSchema = {
  type: 'object',
  properties: { projectId: { type: 'string' } },
  required: ['projectId'],
} as const

const paramsIdSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const

const tagProperties = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  kind: { type: 'string', enum: [...TAG_KINDS] },
} as const

const auth = [{ cookieAuth: [] }]

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

export async function tagsRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/tags', {
    schema: {
      description: 'List AO3-style tags of a project (seeds from storyMeta on first access)',
      tags: ['Tags'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const tags = await tagsService.list(projectId, user.id)
      if (!tags) return notFound(reply)
      return tags
    },
  })

  app.get('/tags', {
    schema: {
      description: 'List tags across the current user projects (for filters)',
      tags: ['Tags'],
      security: auth,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      return tagsService.listForUserProjects(user.id)
    },
  })

  app.post('/projects/:projectId/tags', {
    schema: {
      description: 'Create or reuse a tag in a project',
      tags: ['Tags'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        required: ['name'],
        properties: tagProperties,
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const body = request.body as { name: string; kind?: TagKind }
      const tag = await tagsService.create(projectId, user.id, body)
      if (!tag) return notFound(reply)
      return reply.code(201).send(tag)
    },
  })

  app.patch('/tags/:id', {
    schema: {
      description: 'Rename a tag or change its AO3 kind',
      tags: ['Tags'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: tagProperties,
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const body = request.body as { name?: string; kind?: TagKind }
      const tag = await tagsService.update(id, user.id, body)
      if (!tag) return notFound(reply)
      return tag
    },
  })

  app.delete('/tags/:id', {
    schema: {
      description: 'Delete a tag from its project',
      tags: ['Tags'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await tagsService.remove(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })
}
