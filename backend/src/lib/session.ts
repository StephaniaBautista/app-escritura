import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from './auth.js'
import { roleService } from '../services/role-service.js'

export async function getSessionUser(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers as Record<string, string>,
  })
  return session?.user ?? null
}

export async function requirePermission(request: FastifyRequest, reply: FastifyReply, permission: string) {
  const user = await getSessionUser(request)
  if (!user) {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    return null
  }
  const permissions = await roleService.getPermissions(user.role ?? 'user')
  if (!permissions.includes(permission)) {
    reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Sin permiso para esta acción' } })
    return null
  }
  return user
}
