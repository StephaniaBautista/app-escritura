import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  worldbuildingService,
  type GlossaryEntryInput,
  type LocationInput,
  type WorldRouteInput,
} from '../services/worldbuilding-service.js'
import { loreRoutes } from './worldbuilding-lore.js'
import { raceRoutes } from './worldbuilding-races.js'
import { creatureRoutes } from './worldbuilding-creatures.js'

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

const positionSchema = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
  },
  required: ['x', 'y'],
} as const

const auth = [{ cookieAuth: [] }]

function notFound(reply: import('fastify').FastifyReply) {
  return reply.code(404).send({ error: 'NOT_FOUND' })
}

function badRequest(reply: import('fastify').FastifyReply, message: string) {
  return reply.code(400).send({ error: message })
}

export async function worldbuildingRoutes(app: FastifyInstance) {
  await loreRoutes(app)
  await raceRoutes(app)
  await creatureRoutes(app)

  // --- Glosario ---
  app.get('/projects/:projectId/glossary', {
    schema: {
      description: 'List glossary entries of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const entries = await worldbuildingService.listGlossary(projectId, user.id)
      if (!entries) return notFound(reply)
      return entries
    },
  })

  app.post('/projects/:projectId/glossary', {
    schema: {
      description: 'Create a glossary entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        properties: {
          word: { type: 'string', minLength: 1, maxLength: 300 },
          pronunciation: { type: ['string', 'null'], maxLength: 300 },
          meaning: { type: ['string', 'null'], maxLength: 10000 },
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const entry = await worldbuildingService.createGlossary(projectId, user.id, request.body as GlossaryEntryInput)
      if (!entry) return notFound(reply)
      return reply.code(201).send(entry)
    },
  })

  app.put('/glossary/:id', {
    schema: {
      description: 'Update a glossary entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: {
          word: { type: 'string', minLength: 1, maxLength: 300 },
          pronunciation: { type: ['string', 'null'], maxLength: 300 },
          meaning: { type: ['string', 'null'], maxLength: 10000 },
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const entry = await worldbuildingService.updateGlossary(id, user.id, request.body as GlossaryEntryInput)
      if (!entry) return notFound(reply)
      return entry
    },
  })

  app.delete('/glossary/:id', {
    schema: {
      description: 'Delete a glossary entry',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await worldbuildingService.removeGlossary(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  // --- Ubicaciones (mapa mundial) ---
  app.get('/projects/:projectId/locations', {
    schema: {
      description: 'List locations of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const locations = await worldbuildingService.listLocations(projectId, user.id)
      if (!locations) return notFound(reply)
      return locations
    },
  })

  app.post('/projects/:projectId/locations', {
    schema: {
      description: 'Create a location',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          position: positionSchema,
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const location = await worldbuildingService.createLocation(projectId, user.id, request.body as LocationInput)
      if (!location) return notFound(reply)
      return reply.code(201).send(location)
    },
  })

  app.put('/locations/:id', {
    schema: {
      description: 'Update a location (including position)',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          position: positionSchema,
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const location = await worldbuildingService.updateLocation(id, user.id, request.body as LocationInput)
      if (!location) return notFound(reply)
      return location
    },
  })

  app.delete('/locations/:id', {
    schema: {
      description: 'Delete a location',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await worldbuildingService.removeLocation(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })

  // --- Rutas entre ubicaciones ---
  app.get('/projects/:projectId/routes', {
    schema: {
      description: 'List world routes of a project',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const routes = await worldbuildingService.listRoutes(projectId, user.id)
      if (!routes) return notFound(reply)
      return routes
    },
  })

  app.post('/projects/:projectId/routes', {
    schema: {
      description: 'Create a route between two locations',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsProjectSchema,
      body: {
        type: 'object',
        properties: {
          locationAId: { type: 'string' },
          locationBId: { type: 'string' },
          label: { type: ['string', 'null'], maxLength: 200 },
        },
        required: ['locationAId', 'locationBId'],
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const route = await worldbuildingService.createRoute(projectId, user.id, request.body as WorldRouteInput)
      if (!route) return badRequest(reply, 'INVALID_ROUTE')
      return reply.code(201).send(route)
    },
  })

  app.delete('/routes/:id', {
    schema: {
      description: 'Delete a world route',
      tags: ['Worldbuilding'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await worldbuildingService.removeRoute(id, user.id)
      if (!removed) return notFound(reply)
      return reply.code(204).send()
    },
  })
}
