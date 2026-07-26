import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
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

// Auth routes plugin
export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/auth/register', async (request, reply) => {
    try {
      const { email, password, name } = request.body as {
        email: string
        password: string
        name?: string
      }

      const result = await auth.api.signUpEmail({
        body: { email, password, name: name || '' },
      })

      return reply.status(201).send(result)
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'REGISTRATION_FAILED',
          message: error.message || 'Error al registrar usuario',
        },
      })
    }
  })

  // Login
  app.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as {
        email: string
        password: string
      }

      const result = await auth.api.signInEmail({
        body: { email, password },
      })

      return reply.send(result)
    } catch (error: any) {
      return reply.status(401).send({
        error: {
          code: 'LOGIN_FAILED',
          message: error.message || 'Credenciales inválidas',
        },
      })
    }
  })

  // Logout
  app.post('/auth/logout', async (request, reply) => {
    try {
      await auth.api.signOut({
        headers: request.headers as Record<string, string>,
      })

      return reply.send({ message: 'Sesión cerrada' })
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message || 'Error al cerrar sesión',
        },
      })
    }
  })

  // Get current session
  app.get('/auth/session', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      })

      if (!session) {
        return reply.status(401).send({
          error: {
            code: 'NO_SESSION',
            message: 'No hay sesión activa',
          },
        })
      }

      return reply.send(session)
    } catch (error: any) {
      return reply.status(401).send({
        error: {
          code: 'SESSION_ERROR',
          message: error.message || 'Error al obtener sesión',
        },
      })
    }
  })
}
