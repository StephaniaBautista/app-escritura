import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from './auth.js'

export async function getSessionUser(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers as Record<string, string>,
  })
  return session?.user ?? null
}

export async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
  const user = await getSessionUser(request)
  if (!user) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
  }
  if (user.role !== 'superadmin') {
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Requiere rol superadmin' } })
  }
  return user
}
