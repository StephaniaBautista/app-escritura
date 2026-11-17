import type { FastifyInstance, FastifyReply } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { parseImageDataUrl } from '../lib/image-data-url.js'
import { replySubplotError } from '../lib/subplot-errors.js'
import { timelineService, type TimelineEraInput, type TimelineEventInput } from '../services/timeline-service.js'
import { storageService, StorageUnavailableError, MAX_IMAGE_BYTES } from '../services/storage-service.js'

const MAX_IMAGE_BODY = MAX_IMAGE_BYTES + 512 * 1024
const HEX_COLOR = '^#[0-9a-fA-F]{6}$'
const idList = { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 100 } } as const

const timelineBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 300 },
    date: { type: ['string', 'null'], maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 5000 },
    order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
    eraId: { type: ['string', 'null'], maxLength: 100 },
    characterIds: idList,
    icon: { type: ['string', 'null'], maxLength: 40 },
    color: { type: ['string', 'null'], pattern: HEX_COLOR },
    groupName: { type: ['string', 'null'], maxLength: 100 },
    precision: { type: ['string', 'null'], enum: ['year', 'month', 'day', 'minute', null] },
    endDate: { type: ['string', 'null'], maxLength: 200 },
    label: { type: ['string', 'null'], maxLength: 100 },
    labelColor: { type: ['string', 'null'], pattern: HEX_COLOR },
    imageUrl: { type: 'null' },
    relatedEventIds: idList,
    relatedDocumentIds: idList,
    subplotId: { type: ['string', 'null'], maxLength: 100 },
  },
} as const

const eraBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    color: { type: ['string', 'null'], pattern: HEX_COLOR },
    precision: { type: ['string', 'null'], enum: ['year', 'month', 'week', 'day', 'hour', 'minute', null] },
    startDate: { type: ['string', 'null'], maxLength: 200 },
    endDate: { type: ['string', 'null'], maxLength: 200 },
    rollover: { type: ['string', 'null'], enum: ['newYear', 'afterYear', null] },
  },
} as const

const eraCreateSchema = { ...eraBodySchema, required: ['name'] } as const

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

function notFound(reply: FastifyReply) {
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
      description: 'Create a timeline event. Evolution characterIds are dropped unless the original appears on an earlier event. `subplotId` must belong to the project (400 SUBPLOT_NOT_IN_PROJECT otherwise).',
      tags: ['Timeline'],
      security: auth,
      params: paramsProjectSchema,
      body: timelineBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      try {
        const event = await timelineService.create(projectId, user.id, request.body as TimelineEventInput)
        if (!event) return notFound(reply)
        return reply.code(201).send(event)
      } catch (err: unknown) {
        return replySubplotError(reply, err)
      }
    },
  })

  app.put('/timeline/:id', {
    schema: {
      description: 'Update a timeline event (imageUrl only accepts null to clear the image). Evolution characterIds require the original on an earlier event. `subplotId` must belong to the project (400 SUBPLOT_NOT_IN_PROJECT otherwise); null clears it.',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
      body: timelineBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      try {
        const event = await timelineService.update(id, user.id, request.body as TimelineEventInput)
        if (!event) return notFound(reply)
        return event
      } catch (err: unknown) {
        return replySubplotError(reply, err)
      }
    },
  })

  app.put('/timeline/:id/image', {
    config: { bodyLimit: MAX_IMAGE_BODY },
    schema: {
      description: 'Upload a timeline event image (base64 dataUrl) to Supabase Storage',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        required: ['dataUrl'],
        properties: { dataUrl: { type: 'string' } },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const event = await timelineService.get(id, user.id)
      if (!event) return notFound(reply)
      const parsed = parseImageDataUrl((request.body as { dataUrl: string }).dataUrl ?? '')
      if (!parsed) return reply.code(400).send({ error: { code: 'INVALID_IMAGE', message: 'dataUrl inválida (se espera data:image/{jpeg,png,webp,gif};base64,...)' } })
      try {
        const imageUrl = await storageService.uploadTimelineImage(id, parsed.buffer, parsed.mime)
        return await timelineService.update(id, user.id, { imageUrl })
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Supabase Storage no está configurado' } })
        }
        if (err instanceof Error && err.message.includes('supera')) {
          return reply.code(400).send({ error: { code: 'IMAGE_TOO_LARGE', message: err.message } })
        }
        request.log.error({ err }, 'timeline image upload failed')
        return reply.code(500).send({ error: { code: 'STORAGE_ERROR', message: 'Error al subir la imagen' } })
      }
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
      body: eraCreateSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const era = await timelineService.createEra(projectId, user.id, request.body as TimelineEraInput & { name: string })
      if (!era) return notFound(reply)
      return reply.code(201).send(era)
    },
  })

  app.put('/timeline-eras/:id', {
    schema: {
      description: 'Update a timeline era (name, color, precision, range, rollover)',
      tags: ['Timeline'],
      security: auth,
      params: paramsIdSchema,
      body: eraBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const era = await timelineService.updateEra(id, user.id, request.body as TimelineEraInput)
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
