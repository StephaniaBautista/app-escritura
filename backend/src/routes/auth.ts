import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { auth } from '../lib/auth.js'
import { getTrustedHost } from '../lib/trusted-host.js'
import { normalizeAuthError } from '../lib/auth-error-normalizer.js'
import { logSecurityEvent } from '../lib/security-log.js'
import { userAdminService } from '../services/user-admin-service.js'

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
  const host = getTrustedHost(request.headers.host)
  const url = new URL(request.url, `${request.protocol}://${host}`)
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
async function forwardWebResponse(webResponse: Response, reply: FastifyReply, url: string) {
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
    const normalized = normalizeAuthError(url, webResponse.status, body)
    reply.status(normalized.status).send(normalized.body)
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
  // Rate limit for auth endpoints (intentionally loose: the E2E suite and
  // rapid local logins must not be blocked; brute-force protection is the
  // global 100/min limit plus the platform proxy). Configurable via env for
  // dev/E2E; production keeps the default.
  await app.register(rateLimit, {
    max: parseInt(process.env.AUTH_RATE_MAX ?? '500', 10),
    timeWindow: '15 minutes',
  })

  // Catch-all for BetterAuth handler - handles all /auth/* paths
  app.all('/auth/*', async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown> | null

      if (request.url.includes('/auth/sign-in/email')) {
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null
        if (email) {
          const account = await userAdminService.findForLogin(email)
          if (account) {
            const { blocked, reason } = userAdminService.isBlocked(account.status, account.suspendedUntil)
            if (blocked) {
              logSecurityEvent(request, { event: `auth.sign_in.blocked_${reason}`, email })
              return reply.status(403).send({
                error: {
                  code: reason === 'banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
                  message: reason === 'banned'
                    ? 'Esta cuenta ha sido baneada'
                    : 'Esta cuenta está suspendida temporalmente',
                },
              })
            }
          }
        }
      }

      const webRequest = toWebRequest(request)
      const webResponse = await auth.handler(webRequest)

      const email = typeof body?.email === 'string' ? body.email : undefined

      if (request.url.includes('/auth/sign-in/email') && webResponse.status >= 400) {
        logSecurityEvent(request, { event: 'auth.sign_in.failed', email })
      }
      if (request.url.includes('/auth/sign-up/email') && webResponse.status >= 400) {
        logSecurityEvent(request, { event: 'auth.sign_up.failed', email })
      }
      if (request.url.includes('/auth/sign-out')) {
        logSecurityEvent(request, { event: 'auth.sign_out', email })
      }
      if (request.url.includes('/auth/forgot-password')) {
        logSecurityEvent(request, { event: 'auth.forgot_password.requested', email })
      }
      if (request.url.includes('/auth/reset-password') && webResponse.status >= 400) {
        logSecurityEvent(request, { event: 'auth.reset_password.failed', email })
      }

      await forwardWebResponse(webResponse, reply, request.url)
    } catch (err) {
      request.log.error({ err }, 'Auth handler threw')
      return reply.status(500).send({
        error: {
          code: 'AUTH_ERROR',
          message: 'Error de autenticación',
        },
      })
    }
  })
}
