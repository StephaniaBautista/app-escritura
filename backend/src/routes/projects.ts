import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../lib/auth.js'
import { projectService } from '../services/document-service.js'

async function getSessionUser(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers as Record<string, string>,
  })
  return session?.user ?? null
}

export async function projectRoutes(app: FastifyInstance) {
  app.get('/projects', {
    schema: {
      description: 'List all projects for the authenticated user',
      tags: ['Projects'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const projects = await projectService.list(user.id)
    return projects
  })

  app.get('/projects/:id', {
    schema: {
      description: 'Get a project with its folders, root documents and document tree',
      tags: ['Projects'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            folders: { type: 'array', items: { type: 'object' } },
            documents: { type: 'array', items: { type: 'object' } },
            tree: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  type: { type: 'string' },
                  parentId: { type: 'string', nullable: true },
                  order: { type: 'number' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const page = await projectService.getProjectPage(id, user.id)
    if (!page) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })

    return page
  })

  app.post('/projects', {
    schema: {
      description: 'Create a new project',
      tags: ['Projects'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { name, description } = request.body as { name: string; description?: string }
    const project = await projectService.create(user.id, { name, description })
    return reply.status(201).send(project)
  })

  app.patch('/projects/:id', {
    schema: {
      description: 'Update a project',
      tags: ['Projects'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const body = request.body as { name?: string; description?: string }
    const project = await projectService.update(id, user.id, body)
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })

    return project
  })

  app.delete('/projects/:id', {
    schema: {
      description: 'Delete a project and all its documents',
      tags: ['Projects'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const deleted = await projectService.delete(id, user.id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })

    return { message: 'Proyecto eliminado' }
  })
}
