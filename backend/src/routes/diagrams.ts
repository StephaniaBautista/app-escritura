import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  diagramService,
  DIAGRAM_TYPES,
  type DiagramInput,
  type DiagramType,
} from '../services/diagram-service.js'

const diagramBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 300 },
    type: { type: 'string', enum: [...DIAGRAM_TYPES] },
    layout: {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          maxItems: 500,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              position: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' } },
                required: ['x', 'y'],
              },
            },
            required: ['id', 'position'],
          },
        },
        notes: {
          type: 'array',
          maxItems: 200,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              position: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' } },
                required: ['x', 'y'],
              },
              text: { type: 'string', maxLength: 2000 },
            },
            required: ['id', 'position', 'text'],
          },
        },
      },
    },
  },
} as const

const generateBodySchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['familyTree', 'relationships'] },
    name: { type: ['string', 'null'], maxLength: 300 },
  },
  required: ['type'],
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

export async function diagramRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/diagrams', {
    schema: {
      description: 'List diagrams of a project',
      tags: ['Diagrams'],
      security: auth,
      params: paramsProjectSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const diagrams = await diagramService.listByProject(projectId, user.id)
      if (!diagrams) return reply.code(404).send({ error: 'NOT_FOUND' })
      return diagrams
    },
  })

  app.post('/projects/:projectId/diagrams', {
    schema: {
      description: 'Create a diagram (custom or with initial layout)',
      tags: ['Diagrams'],
      security: auth,
      params: paramsProjectSchema,
      body: diagramBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const diagram = await diagramService.create(projectId, user.id, request.body as DiagramInput)
      if (!diagram) return reply.code(404).send({ error: 'NOT_FOUND' })
      return reply.code(201).send(diagram)
    },
  })

  app.post('/projects/:projectId/diagrams/generate', {
    schema: {
      description: 'Auto-generate a diagram (familyTree from parentIds, relationships circle)',
      tags: ['Diagrams'],
      security: auth,
      params: paramsProjectSchema,
      body: generateBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { projectId } = request.params as { projectId: string }
      const { type, name } = request.body as { type: DiagramType; name?: string | null }
      const diagram = await diagramService.generate(projectId, user.id, type, name ?? undefined)
      if (!diagram) return reply.code(404).send({ error: 'NOT_FOUND' })
      return reply.code(201).send(diagram)
    },
  })

  app.get('/diagrams/:id', {
    schema: {
      description: 'Get a diagram with its layout',
      tags: ['Diagrams'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const diagram = await diagramService.get(id, user.id)
      if (!diagram) return reply.code(404).send({ error: 'NOT_FOUND' })
      return diagram
    },
  })

  app.put('/diagrams/:id', {
    schema: {
      description: 'Update a diagram (rename or save layout)',
      tags: ['Diagrams'],
      security: auth,
      params: paramsIdSchema,
      body: diagramBodySchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const diagram = await diagramService.update(id, user.id, request.body as DiagramInput)
      if (!diagram) return reply.code(404).send({ error: 'NOT_FOUND' })
      return diagram
    },
  })

  app.delete('/diagrams/:id', {
    schema: {
      description: 'Delete a diagram',
      tags: ['Diagrams'],
      security: auth,
      params: paramsIdSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
      const { id } = request.params as { id: string }
      const removed = await diagramService.remove(id, user.id)
      if (!removed) return reply.code(404).send({ error: 'NOT_FOUND' })
      return reply.code(204).send()
    },
  })
}
