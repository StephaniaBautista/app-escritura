import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../lib/auth.js'
import { documentService } from '../services/document-service.js'
import { Prisma } from '@generated/client'

// Upper bound for the serialized TipTap JSON content of a document.
const MAX_CONTENT_BYTES = 1_000_000

function contentTooLarge(content: Record<string, unknown> | undefined): boolean {
  if (!content) return false
  return JSON.stringify(content).length > MAX_CONTENT_BYTES
}

async function getSessionUser(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers as Record<string, string>,
  })
  return session?.user ?? null
}

export async function documentRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/documents', {
    schema: {
      description: 'Get the document tree for a project (chapters, subpages)',
      tags: ['Documents'],
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
    const tree = await documentService.getTree(projectId, user.id)
    return tree
  })

  app.get('/documents/:id', {
    schema: {
      description: 'Get a document with its content and children',
      tags: ['Documents'],
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
    const doc = await documentService.getById(id, user.id)
    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return doc
  })

  app.post('/documents', {
    schema: {
      description: 'Create a new document, chapter, or subpage',
      tags: ['Documents'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'projectId'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          content: { type: 'object', description: 'TipTap JSON content' },
          type: { type: 'string', enum: ['document', 'chapter', 'subpage'], default: 'document' },
          projectId: { type: 'string' },
          folderId: { type: 'string' },
          parentId: { type: 'string', description: 'Parent document ID (for chapters/subpages)' },
          order: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const body = request.body as {
      title: string
      content?: Record<string, unknown>
      type?: 'document' | 'chapter' | 'subpage'
      projectId: string
      folderId?: string
      parentId?: string
      order?: number
    }

    if (contentTooLarge(body.content)) {
      return reply.status(413).send({ error: { code: 'CONTENT_TOO_LARGE', message: 'Contenido demasiado grande' } })
    }

    const doc = await documentService.create(user.id, {
      ...body,
      content: body.content as Prisma.InputJsonValue | undefined,
    })
    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Proyecto, carpeta o documento padre no encontrado' } })

    return reply.status(201).send(doc)
  })

  app.patch('/documents/:id', {
    schema: {
      description: 'Update document content, title, or metadata',
      tags: ['Documents'],
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
          content: { type: 'object', description: 'TipTap JSON content' },
          folderId: { type: 'string', nullable: true },
          parentId: { type: 'string', nullable: true },
          order: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const { id } = request.params as { id: string }
    const body = request.body as {
      title?: string
      content?: Record<string, unknown>
      folderId?: string | null
      parentId?: string | null
      order?: number
    }

    if (contentTooLarge(body.content)) {
      return reply.status(413).send({ error: { code: 'CONTENT_TOO_LARGE', message: 'Contenido demasiado grande' } })
    }

    const doc = await documentService.update(id, user.id, {
      ...body,
      content: body.content as Prisma.InputJsonValue | undefined,
    })
    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return doc
  })

  app.delete('/documents/:id', {
    schema: {
      description: 'Delete a document and all its children',
      tags: ['Documents'],
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
    const deleted = await documentService.delete(id, user.id)
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return { message: 'Documento eliminado' }
  })

  app.post('/documents/:id/duplicate', {
    schema: {
      description: 'Duplicate a document tab and all its subpages',
      tags: ['Documents'],
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
    const duplicated = await documentService.duplicate(id, user.id)
    if (!duplicated) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })

    return reply.status(201).send(duplicated)
  })
}

