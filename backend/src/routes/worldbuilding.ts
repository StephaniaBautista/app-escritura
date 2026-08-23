import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  worldbuildingService,
  type LoreEntryInput,
  type RaceInput,
  type GlossaryEntryInput,
  type CreatureInput,
  type LocationInput,
  type WorldRouteInput,
} from '../services/worldbuilding-service.js'

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
  // --- Lore ---
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          type: { type: 'string', maxLength: 50 },
          limits: { type: ['string', 'null'], maxLength: 10000 },
          order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
        },
      },
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          type: { type: 'string', maxLength: 50 },
          limits: { type: ['string', 'null'], maxLength: 10000 },
          order: { type: ['integer', 'null'], minimum: 0, maximum: 100000 },
        },
      },
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
      return reply.code(204).send()
    },
  })

  // --- Razas ---
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          classification: { type: ['string', 'null'], maxLength: 200 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          physicalTraits: { type: ['string', 'null'], maxLength: 10000 },
          hasMagic: { type: 'boolean' },
          magicDescription: { type: ['string', 'null'], maxLength: 10000 },
          lifeExpectancy: { type: ['integer', 'null'], minimum: 0 },
          language: { type: ['string', 'null'], maxLength: 200 },
          culture: { type: ['string', 'null'], maxLength: 10000 },
          religion: { type: ['string', 'null'], maxLength: 10000 },
          origin: { type: ['string', 'null'], maxLength: 10000 },
          territory: { type: ['string', 'null'], maxLength: 500 },
        },
      },
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          classification: { type: ['string', 'null'], maxLength: 200 },
          description: { type: ['string', 'null'], maxLength: 10000 },
          physicalTraits: { type: ['string', 'null'], maxLength: 10000 },
          hasMagic: { type: 'boolean' },
          magicDescription: { type: ['string', 'null'], maxLength: 10000 },
          lifeExpectancy: { type: ['integer', 'null'], minimum: 0 },
          language: { type: ['string', 'null'], maxLength: 200 },
          culture: { type: ['string', 'null'], maxLength: 10000 },
          religion: { type: ['string', 'null'], maxLength: 10000 },
          origin: { type: ['string', 'null'], maxLength: 10000 },
          territory: { type: ['string', 'null'], maxLength: 500 },
        },
      },
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
      return reply.code(204).send()
    },
  })

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

  // --- Criaturas ---
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          species: { type: ['string', 'null'], maxLength: 200 },
          dangerType: { type: ['string', 'null'], maxLength: 200 },
          description: { type: ['string', 'null'], maxLength: 10000 },
        },
      },
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
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 300 },
          species: { type: ['string', 'null'], maxLength: 200 },
          dangerType: { type: ['string', 'null'], maxLength: 200 },
          description: { type: ['string', 'null'], maxLength: 10000 },
        },
      },
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
      const removed = await worldbuildingService.removeCreature(id, user.id)
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
