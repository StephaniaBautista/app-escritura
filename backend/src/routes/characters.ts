import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  characterService,
  MAX_SHEET_BACKGROUND_IMAGES,
  SHEET_BACKGROUND_MODES,
  type CharacterInput,
} from '../services/character-service.js'
import { storageService, StorageUnavailableError, MAX_IMAGE_BYTES, validateImage } from '../services/storage-service.js'

const MAX_IMAGE_BODY = MAX_IMAGE_BYTES + 512 * 1024
const MAX_BACKGROUND_BODY = MAX_SHEET_BACKGROUND_IMAGES * (Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 512 * 1024) + 512 * 1024

const characterBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 2000 },
    imageUrl: { type: ['string', 'null'], maxLength: 2000 },
    sheetBackgroundMode: { type: 'string', enum: [...SHEET_BACKGROUND_MODES] },
    sheetBackgroundImages: {
      type: 'array',
      maxItems: MAX_SHEET_BACKGROUND_IMAGES,
      items: { type: 'string', maxLength: 2000 },
    },
    nicknames: { type: 'array', maxItems: 50, items: { type: 'string', maxLength: 100 } },
    age: { type: ['string', 'null'], maxLength: 100 },
    gender: { type: ['string', 'null'], maxLength: 100 },
    heightCm: { type: ['integer', 'null'], minimum: 0, maximum: 500 },
    orientation: { type: ['string', 'null'], maxLength: 100 },
    maritalStatus: { type: ['string', 'null'], maxLength: 100 },
    species: { type: ['string', 'null'], maxLength: 200 },
    birthPlace: { type: ['string', 'null'], maxLength: 200 },
    birthDate: { type: ['string', 'null'], maxLength: 100 },
    role: { type: ['string', 'null'], maxLength: 100 },
    roleSpec: { type: ['string', 'null'], maxLength: 500 },
    isOC: { type: 'boolean' },
    parentIds: { type: 'array', maxItems: 100, items: { type: 'string' } },
    attributes: {
      type: 'object',
      additionalProperties: { type: ['string', 'null'] },
    },
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

function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/s.exec(dataUrl)
  if (!match) return null
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) return null
  return { mime: match[1], buffer }
}

async function cleanupUploadedImages(urls: string[]) {
  await Promise.all(urls.map((url) => storageService.deleteCharacterImage(url).catch(() => undefined)))
}

export async function characterRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/characters', {
    schema: {
      description: 'List characters of a project',
      tags: ['Characters'],
      security: auth,
      params: paramsProjectSchema,
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { projectId } = request.params as { projectId: string }
    const characters = await characterService.listByProject(projectId, user.id)
    if (characters === null) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })
    return characters
  })

  app.post('/projects/:projectId/characters', {
    schema: {
      description: 'Create a character in a project',
      tags: ['Characters'],
      security: auth,
      params: paramsProjectSchema,
      body: { ...characterBodySchema, required: ['name'] },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { projectId } = request.params as { projectId: string }
    const character = await characterService.create(projectId, user.id, request.body as CharacterInput)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })
    return reply.status(201).send(character)
  })

  app.get('/characters/:id', {
    schema: {
      description: 'Get a character with its evolutions',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const character = await characterService.get(id, user.id)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })
    return character
  })

  app.put('/characters/:id', {
    schema: {
      description: 'Update a character',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
      body: characterBodySchema,
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const character = await characterService.update(id, user.id, request.body as CharacterInput)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })
    return character
  })

  app.delete('/characters/:id', {
    schema: {
      description: 'Delete a character (removes it from other characters\' parentIds)',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const deleted = await characterService.delete(id, user.id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })
    return { message: 'Personaje eliminado' }
  })

  app.post('/characters/:id/evolve', {
    schema: {
      description: 'Create an evolution of a character (copy with changes)',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1, maxLength: 2000 },
          changes: characterBodySchema,
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const body = request.body as { reason: string; changes?: Record<string, unknown> }
    const evolved = await characterService.evolve(id, user.id, { reason: body.reason, changes: body.changes ?? {} })
    if (!evolved) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })
    return reply.status(201).send(evolved)
  })

  app.put('/characters/:id/image', {
    config: { bodyLimit: MAX_IMAGE_BODY },
    schema: {
      description: 'Upload a character image (base64 dataUrl) to Supabase Storage',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        required: ['dataUrl'],
        properties: { dataUrl: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const character = await characterService.get(id, user.id)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })

    const parsed = parseImageDataUrl((request.body as { dataUrl: string }).dataUrl ?? '')
    if (!parsed) return reply.status(400).send({ error: { code: 'INVALID_IMAGE', message: 'dataUrl inválida (se espera data:image/{jpeg,png,webp,gif};base64,...)' } })

    const { mime, buffer } = parsed
    try {
      const imageUrl = await storageService.uploadCharacterImage(id, buffer, mime)
      const updated = await characterService.update(id, user.id, { imageUrl })
      if (character.imageUrl) await storageService.deleteCharacterImage(character.imageUrl).catch(() => undefined)
      return updated
    } catch (err: unknown) {
      if (err instanceof StorageUnavailableError) {
        return reply.status(503).send({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Supabase Storage no está configurado' } })
      }
      if (err instanceof Error && err.message.includes('supera')) {
        return reply.status(400).send({ error: { code: 'IMAGE_TOO_LARGE', message: err.message } })
      }
      request.log.error({ err }, 'character image upload failed')
      return reply.status(500).send({ error: { code: 'STORAGE_ERROR', message: 'Error al subir la imagen' } })
    }
  })

  app.put('/characters/:id/background-images', {
    config: { bodyLimit: MAX_BACKGROUND_BODY },
    schema: {
      description: 'Replace character sheet background images',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: {
          keepUrls: {
            type: 'array',
            maxItems: MAX_SHEET_BACKGROUND_IMAGES,
            items: { type: 'string', maxLength: 2000 },
          },
          dataUrls: {
            type: 'array',
            maxItems: MAX_SHEET_BACKGROUND_IMAGES,
            items: { type: 'string', maxLength: MAX_IMAGE_BODY * 2 },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const character = await characterService.get(id, user.id)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })

    const body = request.body as { keepUrls?: string[]; dataUrls?: string[] }
    const keepUrls = body.keepUrls ?? []
    const dataUrls = body.dataUrls ?? []
    const currentUrls = character.sheetBackgroundImages ?? []

    if (keepUrls.some((url) => !currentUrls.includes(url))) {
      return reply.status(400).send({ error: { code: 'INVALID_BACKGROUND', message: 'Solo se pueden conservar imágenes del personaje' } })
    }
    if (keepUrls.length + dataUrls.length > MAX_SHEET_BACKGROUND_IMAGES) {
      return reply.status(400).send({ error: { code: 'TOO_MANY_BACKGROUND_IMAGES', message: `Máximo ${MAX_SHEET_BACKGROUND_IMAGES} imágenes` } })
    }

    const uploadedUrls: string[] = []
    try {
      for (const dataUrl of dataUrls) {
        const parsed = parseImageDataUrl(dataUrl)
        if (!parsed) {
          await cleanupUploadedImages(uploadedUrls)
          return reply.status(400).send({ error: { code: 'INVALID_IMAGE', message: 'dataUrl inválida' } })
        }
        validateImage(parsed.buffer, parsed.mime)
        uploadedUrls.push(await storageService.uploadCharacterBackgroundImage(id, parsed.buffer, parsed.mime))
      }

      const nextUrls = [...keepUrls, ...uploadedUrls]
      const updated = await characterService.update(id, user.id, { sheetBackgroundImages: nextUrls })
      if (!updated) {
        await cleanupUploadedImages(uploadedUrls)
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })
      }

      const removedUrls = currentUrls.filter((url) => !keepUrls.includes(url))
      await cleanupUploadedImages(removedUrls)
      return updated
    } catch (err: unknown) {
      await cleanupUploadedImages(uploadedUrls)
      if (err instanceof StorageUnavailableError) {
        return reply.status(503).send({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Supabase Storage no está configurado' } })
      }
      if (err instanceof Error && err.message.includes('supera')) {
        return reply.status(400).send({ error: { code: 'IMAGE_TOO_LARGE', message: err.message } })
      }
      request.log.error({ err }, 'character background upload failed')
      return reply.status(500).send({ error: { code: 'STORAGE_ERROR', message: 'Error al subir las imágenes de fondo' } })
    }
  })

  app.delete('/characters/:id/image', {
    schema: {
      description: 'Remove the character image (storage + field)',
      tags: ['Characters'],
      security: auth,
      params: paramsIdSchema,
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const character = await characterService.get(id, user.id)
    if (!character) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Personaje no encontrado' } })

    if (character.imageUrl) await storageService.deleteCharacterImage(character.imageUrl).catch(() => undefined)
    return characterService.update(id, user.id, { imageUrl: null })
  })
}
