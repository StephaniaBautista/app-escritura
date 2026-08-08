import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock, roleServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  },
  roleServiceMock: { getPermissions: vi.fn() },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('../role-service.js', () => ({ roleService: roleServiceMock }))

import { userAdminService } from '../user-admin-service.js'

const normalUser = { id: 'u1', email: 'a@b.c', role: 'user', status: 'active', suspendedUntil: null }
const adminUser = { id: 'u2', email: 'admin@b.c', role: 'superadmin', status: 'active', suspendedUntil: null }

describe('userAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue(normalUser)
    roleServiceMock.getPermissions.mockResolvedValue([])
  })

  describe('setStatus', () => {
    it('banea y borra las sesiones del usuario', async () => {
      const result = await userAdminService.setStatus('actor-1', 'u1', { status: 'banned' })

      expect(result).toEqual({ ok: true })
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { status: 'banned', suspendedUntil: null },
      })
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    })

    it('suspende con fecha futura y borra sesiones', async () => {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const result = await userAdminService.setStatus('actor-1', 'u1', { status: 'suspended', until })

      expect(result).toEqual({ ok: true })
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { status: 'suspended', suspendedUntil: new Date(until) },
      })
      expect(prismaMock.session.deleteMany).toHaveBeenCalled()
    })

    it('rechaza suspender sin fecha o con fecha pasada', async () => {
      const past = new Date(Date.now() - 1000).toISOString()

      expect((await userAdminService.setStatus('actor-1', 'u1', { status: 'suspended' })).ok).toBe(false)
      expect((await userAdminService.setStatus('actor-1', 'u1', { status: 'suspended', until: past })).ok).toBe(false)
    })

    it('reactiva y limpia la fecha de suspensión sin borrar sesiones', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...normalUser, status: 'suspended', suspendedUntil: new Date() })

      const result = await userAdminService.setStatus('actor-1', 'u1', { status: 'active' })

      expect(result).toEqual({ ok: true })
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { status: 'active', suspendedUntil: null },
      })
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled()
    })

    it('no permite modificarse a sí mismo', async () => {
      const result = await userAdminService.setStatus('u1', 'u1', { status: 'banned' })

      expect(result).toEqual({ ok: false, reason: 'self-target' })
      expect(prismaMock.user.update).not.toHaveBeenCalled()
    })

    it('no permite modificar a un superadmin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(adminUser)
      roleServiceMock.getPermissions.mockResolvedValue(['admin', 'moderate'])

      const result = await userAdminService.setStatus('actor-1', 'u2', { status: 'banned' })

      expect(result).toEqual({ ok: false, reason: 'protected-admin' })
    })

    it('no permite modificar a un usuario inexistente', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await userAdminService.setStatus('actor-1', 'nope', { status: 'banned' })

      expect(result).toEqual({ ok: false, reason: 'not-found' })
    })
  })

  describe('deleteUser', () => {
    it('elimina físicamente al usuario', async () => {
      const result = await userAdminService.deleteUser('actor-1', 'u1')

      expect(result).toEqual({ ok: true })
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } })
    })

    it('no permite eliminarse a sí mismo', async () => {
      const result = await userAdminService.deleteUser('u1', 'u1')

      expect(result).toEqual({ ok: false, reason: 'self-target' })
    })

    it('no permite eliminar a un superadmin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(adminUser)
      roleServiceMock.getPermissions.mockResolvedValue(['admin', 'moderate'])

      const result = await userAdminService.deleteUser('actor-1', 'u2')

      expect(result).toEqual({ ok: false, reason: 'protected-admin' })
    })

    it('no permite eliminar a un usuario inexistente', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await userAdminService.deleteUser('actor-1', 'nope')

      expect(result).toEqual({ ok: false, reason: 'not-found' })
    })
  })

  describe('isBlocked', () => {
    it('bloquea cuentas baneadas', () => {
      expect(userAdminService.isBlocked('banned', null)).toEqual({ blocked: true, reason: 'banned' })
    })

    it('bloquea suspensiones vigentes y permite las caducadas', () => {
      expect(userAdminService.isBlocked('suspended', new Date(Date.now() + 1000))).toEqual({ blocked: true, reason: 'suspended' })
      expect(userAdminService.isBlocked('suspended', new Date(Date.now() - 1000))).toEqual({ blocked: false, reason: null })
    })

    it('permite cuentas activas', () => {
      expect(userAdminService.isBlocked('active', null)).toEqual({ blocked: false, reason: null })
    })
  })
})
