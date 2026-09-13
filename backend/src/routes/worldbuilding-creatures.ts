import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { parseImageDataUrl } from '../lib/image-data-url.js'
import { CREATURE_DANGER_TYPES, worldbuildingService, type CreatureInput } from '../services/worldbuilding-service.js'
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

const creatureBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    species: { type: ['string', 'null'], maxLength: 200 },
    dangerType: {
      anyOf: [
        { type: 'string', enum: [...CREATURE_DANGER_TYPES] },
        { type: 'null' },
      ],
    },
    description: { type: ['string', 'null'], maxLength: 10000 },
  },
} as const

const auth = [{ cookieAuth: [] }]
const MAX_IMAGE_BODY = MAX_IMAGE_BYTES + 512 * 1024

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

async function removeStoredFile(url: string | null | undefined) {
  if (!url) return
  await storageService.deleteCharacterImage(url).catch(() => undefined)
}

export async function creatureRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/creatures', {
    schema: {
      description: 'List creatures of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const creatures = await worldbuildingService.listCreatures(projectId, user.id)
      if (!creatures) return notFound(reply)
      return creatures
    },
  })

  app.post('/projects/:projectId/creatures', {
    schema: {
      description: 'Create a creature',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: creatureBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const creature = await worldbuildingService.createCreature(projectId, user.id, request.body as CreatureInput)
      if (!creature) return notFound(reply)
      return reply.code(201).send(creature)
    },
  })

  app.put('/creatures/:id', {
    schema: {
      description: 'Update a creature',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: creatureBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const creature = await worldbuildingService.updateCreature(id, user.id, request.body as CreatureInput)
      if (!creature) return notFound(reply)
      return creature
    },
  })

  app.put('/creatures/:id/image', {
    config: { bodyLimit: MAX_IMAGE_BODY },
    schema: {
      description: 'Upload a creature image (base64 dataUrl) to the creature-images bucket',
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
      const existing = await worldbuildingService.getCreature(id, user.id)
      if (!existing) return notFound(reply)

      const parsed = parseImageDataUrl((request.body as { dataUrl: string }).dataUrl ?? '')
      if (!parsed) return reply.code(400).send({ error: 'INVALID_IMAGE' })

      try {
        const imageUrl = await storageService.uploadCreatureImage(id, parsed.buffer, parsed.mime)
        const creature = await worldbuildingService.attachCreatureImage(id, user.id, imageUrl)
        if (!creature) return notFound(reply)
        if (existing.imageUrl) await removeStoredFile(existing.imageUrl)
        return creature
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: 'STORAGE_UNAVAILABLE' })
        }
        if (err instanceof Error && err.message.includes('supera')) {
          return reply.code(400).send({ error: err.message })
        }
        request.log.error({ err }, 'creature image upload failed')
        return reply.code(500).send({ error: 'STORAGE_ERROR' })
      }
    },
  })

  app.delete('/creatures/:id/image', {
    schema: {
      description: 'Remove the image of a creature',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getCreature(id, user.id)
      if (!existing) return notFound(reply)
      const creature = await worldbuildingService.clearCreatureImage(id, user.id)
      if (!creature) return notFound(reply)
      await removeStoredFile(existing.imageUrl)
      return creature
    },
  })

  app.delete('/creatures/:id', {
    schema: {
      description: 'Delete a creature',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getCreature(id, user.id)
      if (!existing) return notFound(reply)
      const removed = await worldbuildingService.removeCreature(id, user.id)
      if (!removed) return notFound(reply)
      await removeStoredFile(existing.imageUrl)
      return reply.code(204).send()
    },
  })
}
