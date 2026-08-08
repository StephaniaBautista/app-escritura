import type { FastifyInstance } from 'fastify'
import { requirePermission } from '../lib/session.js'
import { roleService, ALL_PERMISSIONS } from '../services/role-service.js'

export async function adminRolesRoutes(app: FastifyInstance) {
  app.get('/admin/roles', {
    schema: {
      description: 'List roles with user counts (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return
    return roleService.list()
  })

  app.post('/admin/roles', {
    schema: {
      description: 'Create a role (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50, pattern: '^[a-z][a-z0-9_-]*$' },
          label: { type: 'string', minLength: 1, maxLength: 100 },
          permissions: { type: 'array', items: { type: 'string', enum: ALL_PERMISSIONS }, uniqueItems: true },
        },
        required: ['name', 'label'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return

    const { name, label, permissions } = request.body as { name: string; label: string; permissions?: string[] }
    const role = await roleService.create({ name, label, permissions: permissions ?? [] })
    if (!role) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'El nombre de rol ya existe' } })
    }
    return reply.status(201).send(role)
  })

  app.patch('/admin/roles/:id', {
    schema: {
      description: 'Update a role label/permissions (admin)',
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
          label: { type: 'string', minLength: 1, maxLength: 100 },
          permissions: { type: 'array', items: { type: 'string', enum: ALL_PERMISSIONS }, uniqueItems: true },
        },
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return

    const { id } = request.params as { id: string }
    const body = request.body as { label?: string; permissions?: string[] }
    const role = await roleService.update(id, body)
    if (!role) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rol no encontrado' } })
    return role
  })

  app.delete('/admin/roles/:id', {
    schema: {
      description: 'Delete a role; users with it are demoted to user (admin)',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return

    const { id } = request.params as { id: string }
    const deleted = await roleService.delete(id)
    if (!deleted) return reply.status(400).send({ error: { code: 'FORBIDDEN', message: 'No se puede eliminar un rol de sistema' } })

    return { ok: true }
  })
}
