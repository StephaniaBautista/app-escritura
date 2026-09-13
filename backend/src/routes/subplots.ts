import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { subplotService, type SubplotInput } from '../services/subplot-service.js'

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

const subplotProperties = {
  title: { type: 'string', minLength: 1, maxLength: 300 },
  description: { type: ['string', 'null'], maxLength: 10000 },
  status: { type: 'string', enum: ['active', 'resolved', 'dropped'] },
  color: { type: ['string', 'null'], maxLength: 50 },
  order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
} as const

const reorderBodySchema = {
  type: 'object',
  properties: {
    subplotIds: { type: 'array', items: { type: 'string' }, maxItems: 1000 },
  },
  required: ['subplotIds'],
} as const

const auth = [{ cookieAuth: [] }]

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

export async function subplotsRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/subplots', {
    schema: {
      description: 'List subplots of a project',
      tags: ['Subplots'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const subplots = await subplotService.list(projectId, user.id)
      if (!subplots) return notFound(reply)
      return subplots
    },
  })

  app.post('/projects/:projectId/subplots', {
    schema: {
      description: 'Create a subplot',
      tags: ['Subplots'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        properties: subplotProperties,
        required: ['title'],
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const subplot = await subplotService.create(projectId, user.id, request.body as SubplotInput)
      if (!subplot) return notFound(reply)
      return reply.code(201).send(subplot)
    },
  })

  app.put('/projects/:projectId/subplots/reorder', {
    schema: {
      description: 'Reorder the subplots of a project',
      tags: ['Subplots'],
      security: auth,
      params: paramsProjectSchema,
      body: reorderBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const { subplotIds } = request.body as { subplotIds: string[] }
      const subplots = await subplotService.reorder(projectId, user.id, subplotIds)
      if (!subplots) return notFound(reply)
      return subplots
    },
  })

  app.put('/subplots/:id', {
    schema: {
      description: 'Update a subplot',
      tags: ['Subplots'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: subplotProperties,
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const subplot = await subplotService.update(id, user.id, request.body as SubplotInput)
      if (!subplot) return notFound(reply)
      return subplot
    },
  })

  app.delete('/subplots/:id', {
    schema: {
      description: 'Delete a subplot',
      tags: ['Subplots'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await subplotService.remove(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })
}
