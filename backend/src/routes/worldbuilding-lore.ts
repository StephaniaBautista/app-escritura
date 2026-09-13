import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { worldbuildingService, type LoreEntryInput } from '../services/worldbuilding-service.js'
import {
  MAX_LORE_PDF_BYTES,
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

const loreBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    description: { type: ['string', 'null'], maxLength: 10000 },
    type: { type: 'string', maxLength: 50 },
    limits: { type: ['string', 'null'], maxLength: 10000 },
    powerSource: { type: ['string', 'null'], maxLength: 2000 },
    cost: { type: ['string', 'null'], maxLength: 2000 },
    usedBy: { type: ['string', 'null'], maxLength: 2000 },
    order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
  },
} as const

const auth = [{ cookieAuth: [] }]

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

async function removeStoredPdf(url: string | null | undefined) {
  if (!url) return
  await storageService.deleteCharacterImage(url).catch(() => undefined)
}

export async function loreRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/lore', {
    schema: {
      description: 'List lore entries of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const entries = await worldbuildingService.listLore(projectId, user.id)
      if (!entries) return notFound(reply)
      return entries
    },
  })

  app.post('/projects/:projectId/lore', {
    schema: {
      description: 'Create a lore entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: loreBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const entry = await worldbuildingService.createLore(projectId, user.id, request.body as LoreEntryInput)
      if (!entry) return notFound(reply)
      return reply.code(201).send(entry)
    },
  })

  app.put('/lore/:id', {
    schema: {
      description: 'Update a lore entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: loreBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const entry = await worldbuildingService.updateLore(id, user.id, request.body as LoreEntryInput)
      if (!entry) return notFound(reply)
      return entry
    },
  })

  app.put('/lore/:id/pdf', {
    config: { bodyLimit: MAX_LORE_PDF_BYTES + 64 * 1024 },
    schema: {
      description: 'Attach a PDF to a lore entry',
      tags: ['Worldbuilding'],
      security: auth,
      consumes: ['multipart/form-data'],
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getLore(id, user.id)
      if (!existing) return notFound(reply)

      const file = await request.file()
      if (!file) return reply.code(400).send({ error: 'NO_FILE' })

      const buffer = await file.toBuffer()
      try {
        const url = await storageService.uploadLorePdf(id, buffer, file.mimetype)
        const entry = await worldbuildingService.attachLorePdf(id, user.id, {
          url,
          name: sanitizePdfName(file.filename || 'adjunto.pdf'),
        })
        if (!entry) return notFound(reply)
        if (existing.pdfUrl) await removeStoredPdf(existing.pdfUrl)
        return entry
      } catch (err: unknown) {
        if (err instanceof StorageUnavailableError) {
          return reply.code(503).send({ error: 'STORAGE_UNAVAILABLE' })
        }
        if (err instanceof Error && (err.message.includes('no permitido') || err.message.includes('no es un PDF') || err.message.includes('supera'))) {
          return reply.code(400).send({ error: err.message })
        }
        request.log.error({ err }, 'lore pdf upload failed')
        return reply.code(500).send({ error: 'STORAGE_ERROR' })
      }
    },
  })

  app.delete('/lore/:id/pdf', {
    schema: {
      description: 'Remove the PDF attached to a lore entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const existing = await worldbuildingService.getLore(id, user.id)
      if (!existing) return notFound(reply)
      const entry = await worldbuildingService.clearLorePdf(id, user.id)
      if (!entry) return notFound(reply)
      await removeStoredPdf(existing.pdfUrl)
      return entry
    },
  })

  app.delete('/lore/:id', {
    schema: {
      description: 'Delete a lore entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await worldbuildingService.removeLore(id, user.id)
      if (!removed) return notFound(reply)
      await removeStoredPdf(removed.pdfUrl)
      return reply.code(204).send()
    },
  })
}
