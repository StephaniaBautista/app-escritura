import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { parseImageDataUrl } from '../lib/image-data-url.js'
import { MAX_CANVAS_BYTES } from '../lib/map-canvas.js'
import { mapService, type MapBoardInput } from '../services/map-service.js'
import { MAX_IMAGE_BYTES, storageService, StorageUnavailableError } from '../services/storage-service.js'

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

const mapBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    canvas: { type: 'object', additionalProperties: true },
  },
} as const

const auth = [{ cookieAuth: [] }]
const MAX_IMAGE_BODY = MAX_IMAGE_BYTES + 512 * 1024
const MAX_CANVAS_BODY = MAX_CANVAS_BYTES + 32 * 1024

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

function isErrorResult(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value && typeof (value as { error: unknown }).error === 'string'
}

async function removeStoredFile(url: string | null | undefined) {
  if (!url) return
  await storageService.deleteCharacterImage(url).catch(() => undefined)
}

export async function mapRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/maps', {
    schema: {
      description: 'List story maps of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const maps = await mapService.list(projectId, user.id)
      if (!maps) return notFound(reply)
      return maps
    },
  })

  app.post('/projects/:projectId/maps', {
    schema: {
      description: 'Create a story map',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const created = await mapService.create(projectId, user.id, request.body as MapBoardInput)
      if (!created) return notFound(reply)
      if (isErrorResult(created)) return reply.code(400).send({ error: created.error })
      return reply.code(201).send(created)
    },
  })

  app.put('/maps/:id', {
    config: { bodyLimit: MAX_CANVAS_BODY },
    schema: {
      description: 'Rename a map or save its canvas',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: mapBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const updated = await mapService.update(id, user.id, request.body as MapBoardInput)
      if (!updated) return notFound(reply)
      if (isErrorResult(updated)) return reply.code(400).send({ error: updated.error })
      return updated
    },
  })

  app.put('/maps/:id/background', {
    config: { bodyLimit: MAX_IMAGE_BODY },
    schema: {
      description: 'Upload a background image for a map (base64 dataUrl)',
      tags: ['Worldbuilding'],
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
      const existing = await mapService.get(id, user.id)
      if (!existing) return notFound(reply)

      const parsed = parseImageDataUrl((request.body as { dataUrl: string }).dataUrl ?? '')
      if (!parsed) return reply.code(400).send({ error: 'INVALID_IMAGE' })

      try {
        const backgroundUrl = await storageService.uploadMapBackground(id, parsed.buffer, parsed.mime)
        const map = await mapService.attachBackground(id, user.id, backgroundUrl)
        if (!map) return notFound(reply)
        if (existing.backgroundUrl) await removeStoredFile(existing.backgroundUrl)
        return map
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: 'STORAGE_UNAVAILABLE' })
        }
        if (err instanceof Error && err.message.includes('supera')) {
          return reply.code(400).send({ error: err.message })
        }
        request.log.error({ err }, 'map background upload failed')
        return reply.code(500).send({ error: 'STORAGE_ERROR' })
      }
    },
  })

  app.delete('/maps/:id/background', {
    schema: {
      description: 'Remove the background image of a map',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await mapService.get(id, user.id)
      if (!existing) return notFound(reply)
      const map = await mapService.clearBackground(id, user.id)
      if (!map) return notFound(reply)
      await removeStoredFile(existing.backgroundUrl)
      return map
    },
  })

  app.delete('/maps/:id', {
    schema: {
      description: 'Delete a story map',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await mapService.remove(id, user.id)
      if (!removed) return notFound(reply)
      await removeStoredFile(removed.backgroundUrl)
      return reply.code(204).send()
    },
  })
}
