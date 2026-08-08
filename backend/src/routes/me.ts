import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { roleService } from '../services/role-service.js'

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', {
    schema: {
      description: 'Current user with role and permissions',
      tags: ['Auth'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    const roleName = user.role ?? 'user'
    const permissions = await roleService.getPermissions(roleName)
    const role = await roleService.findByName(roleName)
    return { user, role, permissions }
  })
}
