import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  COMMENT_MAX_LEN,
  AUTHOR_MAX_LEN,
  QUOTE_MAX_LEN,
  SharingError,
  sharingService,
} from '../services/sharing-service.js'

const paramsDocumentSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const

const paramsTokenSchema = {
  type: 'object',
  properties: { token: { type: 'string', minLength: 10, maxLength: 100 } },
  required: ['token'],
} as const

const paramsCommentSchema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 10, maxLength: 100 },
    commentId: { type: 'string' },
  },
  required: ['token', 'commentId'],
} as const

const commentBodySchema = {
  type: 'object',
  required: ['body'],
  additionalProperties: false,
  properties: {
    blockIndex: { type: 'integer', minimum: 0, maximum: 100000 },
    quote: { type: 'string', maxLength: QUOTE_MAX_LEN },
    body: { type: 'string', minLength: 1, maxLength: COMMENT_MAX_LEN },
    authorName: { type: 'string', maxLength: AUTHOR_MAX_LEN },
  },
} as const

const auth = [{ cookieAuth: [] }]

function sendError(reply: import('fastify').FastifyReply, error: unknown) {
  if (error instanceof SharingError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
  }
  throw error
}

export async function sharingRoutes(app: FastifyInstance) {
  app.post('/documents/:id/share', {
    schema: {
      description: 'Create or rotate the public share link of a document (owner only)',
      tags: ['Sharing'],
      security: auth,
      params: paramsDocumentSchema,
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          includeChildren: { type: 'boolean', default: false },
          allowComments: { type: 'boolean', default: true },
        },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { id } = request.params as { id: string }
      const body = (request.body ?? {}) as { includeChildren?: boolean; allowComments?: boolean }
      const link = await sharingService.createLink(id, user.id, body)
      if (!link) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })
      return link
    },
  })

  app.get('/documents/:id/share', {
    schema: {
      description: 'Get the active share link of a document (owner only)',
      tags: ['Sharing'],
      security: auth,
      params: paramsDocumentSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { id } = request.params as { id: string }
      const link = await sharingService.getLink(id, user.id)
      if (!link) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })
      return link
    },
  })

  app.delete('/documents/:id/share', {
    schema: {
      description: 'Revoke the active share link of a document (owner only)',
      tags: ['Sharing'],
      security: auth,
      params: paramsDocumentSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { id } = request.params as { id: string }
      const revoked = await sharingService.revokeLink(id, user.id)
      if (!revoked) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Documento no encontrado' } })
      return reply.code(204).send()
    },
  })

  app.get('/shared/:token', {
    schema: {
      description: 'Read a shared document by token (public, no account needed)',
      tags: ['Sharing'],
      params: paramsTokenSchema,
    },
    handler: async (request, reply) => {
      const { token } = request.params as { token: string }
      try {
        return await sharingService.readShared(token)
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.get('/shared/:token/comments', {
    schema: {
      description: 'List inline comments of a shared document (public)',
      tags: ['Sharing'],
      params: paramsTokenSchema,
    },
    handler: async (request, reply) => {
      const { token } = request.params as { token: string }
      try {
        return await sharingService.listComments(token)
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.post('/shared/:token/comments', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      description: 'Add an inline comment to a shared document (public; anonymous without account)',
      tags: ['Sharing'],
      params: paramsTokenSchema,
      body: commentBodySchema,
    },
    handler: async (request, reply) => {
      const { token } = request.params as { token: string }
      const body = request.body as { blockIndex: number; quote?: string; body: string; authorName?: string }
      const user = await getSessionUser(request)
      try {
        const comment = await sharingService.addComment(
          token,
          { ...body, blockIndex: body.blockIndex ?? 0 },
          user?.id ?? null,
        )
        return reply.code(201).send(comment)
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.post('/shared/:token/view', {
    schema: {
      description: 'Record a logged-in visit so the document shows in «Compartidos conmigo»',
      tags: ['Sharing'],
      security: auth,
      params: paramsTokenSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { token } = request.params as { token: string }
      try {
        await sharingService.recordView(token, user.id)
        return { ok: true }
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.patch('/shared/:token/comments/:commentId', {
    schema: {
      description: 'Resolve or unresolve an inline comment (document owner only)',
      tags: ['Sharing'],
      security: auth,
      params: paramsCommentSchema,
      body: {
        type: 'object',
        required: ['resolved'],
        additionalProperties: false,
        properties: { resolved: { type: 'boolean' } },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { token, commentId } = request.params as { token: string; commentId: string }
      const { resolved } = request.body as { resolved: boolean }
      try {
        const comment = await sharingService.resolveComment(token, commentId, user.id, resolved)
        if (!comment) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Comentario no encontrado' } })
        return comment
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.delete('/shared/:token/comments/:commentId', {
    schema: {
      description: 'Delete an inline comment (document owner or comment author)',
      tags: ['Sharing'],
      security: auth,
      params: paramsCommentSchema,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      const { token, commentId } = request.params as { token: string; commentId: string }
      try {
        const removed = await sharingService.deleteComment(token, commentId, user.id)
        if (!removed) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Comentario no encontrado' } })
        return reply.code(204).send()
      } catch (error) {
        return sendError(reply, error)
      }
    },
  })

  app.get('/shared-with-me', {
    schema: {
      description: 'List shared documents the current user has visited',
      tags: ['Sharing'],
      security: auth,
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
      return sharingService.listSharedWithMe(user.id)
    },
  })
}
