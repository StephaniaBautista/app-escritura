import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { timelineService, type TimelineEventInput } from '../services/timeline-service.js'

const timelineBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 300 },
    date: { type: ['string', 'null'], maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 5000 },
    order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
    eraId: { type: ['string', 'null'], maxLength: 100 },
    characterIds: { type: 'array', maxItems: 100, items: { type: 'string' } },
  },
} as const

const eraBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    color: { type: ['string', 'null'], maxLength: 20 },
    precision: { type: ['string', 'null'], enum: ['year', 'month', 'week', 'day', 'hour', 'minute', null] },
    startDate: { type: ['string', 'null'], maxLength: 200 },
    endDate: { type: ['string', 'null'], maxLength: 200 },
    rollover: { type: ['string', 'null'], enum: ['newYear', 'afterYear', null] },
  },
  required: ['name'],
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

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

export async function timelineRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/timeline', {
    schema: {
      description: 'List timeline events of a project',
      tags: ['Timeline'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const events = await timelineService.listByProject(projectId, user.id)
      if (!events) return notFound(reply)
      return events
    },
  })

  app.post('/projects/:projectId/timeline', {
    schema: {
      description: 'Create a timeline event',
      tags: ['Timeline'],
      security: auth,
      params: paramsProjectSchema,
      body: timelineBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const event = await timelineService.create(projectId, user.id, request.body as TimelineEventInput)
      if (!event) return notFound(reply)
      return reply.code(201).send(event)
    },
  })

  app.put('/timeline/:id', {
    schema: {
      description: 'Update a timeline event',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
      body: timelineBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const event = await timelineService.update(id, user.id, request.body as TimelineEventInput)
      if (!event) return notFound(reply)
      return event
    },
  })

  app.delete('/timeline/:id', {
    schema: {
      description: 'Delete a timeline event',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await timelineService.remove(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  app.get('/projects/:projectId/timeline-eras', {
    schema: {
      description: 'List timeline eras (franjas) of a project',
      tags: ['Timeline'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const eras = await timelineService.listEras(projectId, user.id)
      if (!eras) return notFound(reply)
      return eras
    },
  })

  app.post('/projects/:projectId/timeline-eras', {
    schema: {
      description: 'Create a timeline era (franja)',
      tags: ['Timeline'],
      security: auth,
      params: paramsProjectSchema,
      body: eraBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const era = await timelineService.createEra(projectId, user.id, request.body as import('../services/timeline-service.js').TimelineEraInput)
      if (!era) return notFound(reply)
      return reply.code(201).send(era)
    },
  })

  app.put('/timeline-eras/:id', {
    schema: {
      description: 'Rename a timeline era',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
      body: eraBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const { name } = request.body as { name: string }
      const era = await timelineService.updateEra(id, user.id, name)
      if (!era) return notFound(reply)
      return era
    },
  })

  app.delete('/timeline-eras/:id', {
    schema: {
      description: 'Delete a timeline era; its events become unassigned (General)',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await timelineService.removeEra(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })
}
