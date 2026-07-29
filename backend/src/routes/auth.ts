import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { auth } from '../lib/auth.js'

// Extend FastifyRequest to include session
declare module 'fastify' {
  interface FastifyRequest {
    session?: {
      user: {
        id: string
        email: string
        name?: string
      }
    }
  }
}

// Authentication middleware
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    })

    if (!session) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado',
        },
      })
    }

    request.session = session
  } catch (error) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sesión inválida',
      },
    })
  }
}

// Helper to convert Fastify request to standard Request for auth.handler
function toWebRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `${request.protocol}://${request.hostname}`)
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }

  const method = request.method
  const body = method !== 'GET' && method !== 'HEAD'
    ? JSON.stringify(request.body)
    : undefined

  return new Request(url.toString(), {
    method,
    headers,
    body,
  })
}

// Helper to forward auth.handler Response to Fastify reply
async function forwardWebResponse(webResponse: Response, reply: FastifyReply) {
  // Forward Set-Cookie headers
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      reply.header(key, value)
    }
  })

  // Forward status and body
  const contentType = webResponse.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await webResponse.json()
    reply.status(webResponse.status).send(body)
  } else {
    const text = await webResponse.text()
    reply.status(webResponse.status).send(text)
  }
}

// Swagger schema definitions
const errorSchema = {
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
}

const sessionUserSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
      },
    },
    session: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        token: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  },
}

const messageSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
}

// Auth routes plugin
export async function authRoutes(app: FastifyInstance) {
  // Stricter rate limit for auth endpoints
  await app.register(rateLimit, {
    max: 20,
    timeWindow: '15 minutes',
  })

  // Catch-all for BetterAuth handler - handles all /auth/* paths
  app.all('/auth/*', async (request, reply) => {
    try {
      const webRequest = toWebRequest(request)
      const webResponse = await auth.handler(webRequest)
      await forwardWebResponse(webResponse, reply)
    } catch {
      return reply.status(500).send({
        error: {
          code: 'AUTH_ERROR',
          message: 'Error de autenticación',
        },
      })
    }
  })
}
