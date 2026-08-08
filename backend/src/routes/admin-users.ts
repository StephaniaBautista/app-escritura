import type { FastifyInstance } from 'fastify'
import { requirePermission } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'
import { roleService } from '../services/role-service.js'
import { userAdminService, USER_STATUSES, type UserStatus } from '../services/user-admin-service.js'

const STATUS_MESSAGES: Record<string, string> = {
  'self-target': 'No puedes modificar tu propia cuenta',
  'protected-admin': 'No puedes modificar a otro superadmin',
  'invalid-until': 'Fecha de suspensión inválida o no futura',
  'not-found': 'Usuario no encontrado',
}

export async function adminUsersRoutes(app: FastifyInstance) {
  app.get('/admin/users', {
    schema: {
      description: 'List users with their role and status (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, status: true, suspendedUntil: true, createdAt: true },
    })
    return users
  })

  app.patch('/admin/users/:id/role', {
    schema: {
      description: 'Assign a role to a user (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: { role: { type: 'string', minLength: 1, maxLength: 50 } },
        required: ['role'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return

    const { id } = request.params as { id: string }
    const { role } = request.body as { role: string }

    const roleExists = await roleService.findByName(role)
    if (!roleExists) {
      return reply.status(400).send({ error: { code: 'INVALID_ROLE', message: 'Rol no existe' } })
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } })

    await prisma.user.update({ where: { id }, data: { role } })
    return { ok: true }
  })

  app.patch('/admin/users/:id/status', {
    schema: {
      description: 'Ban, suspend or reactivate a user account (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: USER_STATUSES },
          until: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['status'],
      },
    },
  }, async (request, reply) => {
    const actor = await requirePermission(request, reply, 'admin')
    if (!actor) return

    const { id } = request.params as { id: string }
    const { status, until } = request.body as { status: UserStatus; until?: string | null }

    const result = await userAdminService.setStatus(actor.id, id, { status, until })
    if (!result.ok) {
      const message = STATUS_MESSAGES[result.reason] ?? 'Operación no permitida'
      const statusCode = result.reason === 'not-found' ? 404 : 400
      return reply.status(statusCode).send({ error: { code: result.reason.toUpperCase(), message } })
    }

    return { ok: true }
  })

  app.delete('/admin/users/:id', {
    schema: {
      description: 'Permanently delete a user account and all its data (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const actor = await requirePermission(request, reply, 'admin')
    if (!actor) return

    const { id } = request.params as { id: string }

    const result = await userAdminService.deleteUser(actor.id, id)
    if (!result.ok) {
      const message = STATUS_MESSAGES[result.reason] ?? 'Operación no permitida'
      return reply.status(result.reason === 'not-found' ? 404 : 400).send({ error: { code: result.reason.toUpperCase(), message } })
    }

    return { ok: true }
  })
}
