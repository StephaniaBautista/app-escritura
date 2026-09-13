import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { parseImageDataUrl } from '../lib/image-data-url.js'
import { worldbuildingService, type RaceInput } from '../services/worldbuilding-service.js'
import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  sanitizePdfName,
  storageService,
  StorageUnavailableError,
} from '../services/storage-service.js'

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

const raceBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    classification: { type: ['string', 'null'], maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 10000 },
    physicalTraits: { type: ['string', 'null'], maxLength: 10000 },
    hasMagic: { type: 'boolean' },
    magicDescription: { type: ['string', 'null'], maxLength: 10000 },
    spiritualTraits: { type: ['string', 'null'], maxLength: 10000 },
    lifeExpectancy: { type: ['string', 'null'], maxLength: 200 },
    language: { type: ['string', 'null'], maxLength: 500 },
    culture: { type: ['string', 'null'], maxLength: 10000 },
    religion: { type: ['string', 'null'], maxLength: 10000 },
    origin: { type: ['string', 'null'], maxLength: 10000 },
    territory: { type: ['string', 'null'], maxLength: 10000 },
    relationsWithOthers: { type: ['string', 'null'], maxLength: 10000 },
    importantNotes: { type: ['string', 'null'], maxLength: 10000 },
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

export async function raceRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/races', {
    schema: {
      description: 'List races of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const races = await worldbuildingService.listRaces(projectId, user.id)
      if (!races) return notFound(reply)
      return races
    },
  })

  app.post('/projects/:projectId/races', {
    schema: {
      description: 'Create a race',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: raceBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const race = await worldbuildingService.createRace(projectId, user.id, request.body as RaceInput)
      if (!race) return notFound(reply)
      return reply.code(201).send(race)
    },
  })

  app.put('/races/:id', {
    schema: {
      description: 'Update a race',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: raceBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const race = await worldbuildingService.updateRace(id, user.id, request.body as RaceInput)
      if (!race) return notFound(reply)
      return race
    },
  })

  app.put('/races/:id/image', {
    config: { bodyLimit: MAX_IMAGE_BODY },
    schema: {
      description: 'Upload a race image (base64 dataUrl) to the race-images bucket',
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
      const existing = await worldbuildingService.getRace(id, user.id)
      if (!existing) return notFound(reply)

      const parsed = parseImageDataUrl((request.body as { dataUrl: string }).dataUrl ?? '')
      if (!parsed) return reply.code(400).send({ error: 'INVALID_IMAGE' })

      try {
        const imageUrl = await storageService.uploadRaceImage(id, parsed.buffer, parsed.mime)
        const race = await worldbuildingService.attachRaceImage(id, user.id, imageUrl)
        if (!race) return notFound(reply)
        if (existing.imageUrl) await removeStoredFile(existing.imageUrl)
        return race
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: 'STORAGE_UNAVAILABLE' })
        }
        if (err instanceof Error && err.message.includes('supera')) {
          return reply.code(400).send({ error: err.message })
        }
        request.log.error({ err }, 'race image upload failed')
        return reply.code(500).send({ error: 'STORAGE_ERROR' })
      }
    },
  })

  app.delete('/races/:id/image', {
    schema: {
      description: 'Remove the image of a race',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getRace(id, user.id)
      if (!existing) return notFound(reply)
      const race = await worldbuildingService.clearRaceImage(id, user.id)
      if (!race) return notFound(reply)
      await removeStoredFile(existing.imageUrl)
      return race
    },
  })

  app.put('/races/:id/pdf', {
    config: { bodyLimit: MAX_PDF_BYTES + 64 * 1024 },
    schema: {
      description: 'Attach a PDF to a race',
      tags: ['Worldbuilding'],
      security: auth,
      consumes: ['multipart/form-data'],
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getRace(id, user.id)
      if (!existing) return notFound(reply)

      const file = await request.file()
      if (!file) return reply.code(400).send({ error: 'NO_FILE' })

      const buffer = await file.toBuffer()
      try {
        const url = await storageService.uploadRacePdf(id, buffer, file.mimetype)
        const race = await worldbuildingService.attachRacePdf(id, user.id, {
          url,
          name: sanitizePdfName(file.filename || 'adjunto.pdf'),
        })
        if (!race) return notFound(reply)
        if (existing.pdfUrl) await removeStoredFile(existing.pdfUrl)
        return race
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: 'STORAGE_UNAVAILABLE' })
        }
        if (err instanceof Error && (err.message.includes('no permitido') || err.message.includes('no es un PDF') || err.message.includes('supera'))) {
          return reply.code(400).send({ error: err.message })
        }
        request.log.error({ err }, 'race pdf upload failed')
        return reply.code(500).send({ error: 'STORAGE_ERROR' })
      }
    },
  })

  app.delete('/races/:id/pdf', {
    schema: {
      description: 'Remove the PDF attached to a race',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getRace(id, user.id)
      if (!existing) return notFound(reply)
      const race = await worldbuildingService.clearRacePdf(id, user.id)
      if (!race) return notFound(reply)
      await removeStoredFile(existing.pdfUrl)
      return race
    },
  })

  app.delete('/races/:id', {
    schema: {
      description: 'Delete a race',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await worldbuildingService.removeRace(id, user.id)
      if (!removed) return notFound(reply)
      await removeStoredFile(removed.imageUrl)
      await removeStoredFile(removed.pdfUrl)
      return reply.code(204).send()
    },
  })
}
