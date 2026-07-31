import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { noteService } from '../services/note-service.js'

export async function noteRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/notes', {
    schema: {
      description: 'List story-level (project) notes, visible in every document of the project',
      tags: ['Notes'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { projectId } = request.params as { projectId: string }
    return noteService.listByProject(projectId, user.id)
  })

  app.post('/projects/:projectId/notes', {
    schema: {
      description: 'Create a story-level (project) note',
      tags: ['Notes'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          content: { type: 'string', maxLength: 50000 },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { projectId } = request.params as { projectId: string }
    const body = request.body as { title: string; content?: string }

    const note = await noteService.createForProject(projectId, user.id, body)
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } })

    return reply.status(201).send(note)
  })

  app.get('/documents/:documentId/notes', {
    schema: {
      description: 'List notes for a document',
      tags: ['Notes'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
        required: ['documentId'],
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    return noteService.listByDocument(documentId, user.id)
  })

  app.post('/documents/:documentId/notes', {
    schema: {
      description: 'Create a note for a document',
      tags: ['Notes'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { documentId: { type: 'string' } },
        required: ['documentId'],
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          content: { type: 'string', maxLength: 50000 },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { documentId } = request.params as { documentId: string }
    const body = request.body as { title: string; content?: string }

    const note = await noteService.createForDocument(documentId, user.id, body)
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return reply.status(201).send(note)
  })

  app.patch('/notes/:id', {
    schema: {
      description: 'Update a note title or content',
      tags: ['Notes'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          content: { type: 'string', maxLength: 50000 },
          isHidden: { type: 'boolean', description: 'Ocultar/mostrar la nota en la pared de post-its' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const body = request.body as { title?: string; content?: string; isHidden?: boolean }

    const note = await noteService.update(id, user.id, body)
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Nota no encontrada' } })

    return note
  })

  app.delete('/notes/:id', {
    schema: {
      description: 'Delete a note',
      tags: ['Notes'],
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
    const deleted = await noteService.delete(id, user.id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Nota no encontrada' } })

    return { message: 'Nota eliminada' }
  })
}
