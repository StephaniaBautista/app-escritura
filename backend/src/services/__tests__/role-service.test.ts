import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { roleService, ALL_PERMISSIONS } from '../role-service.js'

const userRole = { id: 'r1', name: 'user', label: 'Usuario', permissions: [], isSystem: true, createdAt: new Date() }
const adminRole = { id: 'r2', name: 'superadmin', label: 'Superadministrador', permissions: ['admin', 'moderate'], isSystem: true, createdAt: new Date() }

describe('roleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    roleService.invalidate()
  })

  it('list: incluye el número de usuarios por rol', async () => {
    prismaMock.role.findMany.mockResolvedValue([userRole, adminRole])
    prismaMock.user.groupBy.mockResolvedValue([
      { role: 'user', _count: { _all: 5 } },
      { role: 'superadmin', _count: { _all: 1 } },
    ])

    const result = await roleService.list()

    expect(result.find((r) => r.name === 'user')?.userCount).toBe(5)
    expect(result.find((r) => r.name === 'superadmin')?.userCount).toBe(1)
  })

  it('create: no crea si el nombre ya existe', async () => {
    prismaMock.role.findUnique.mockResolvedValue(userRole)

    const result = await roleService.create({ name: 'user', label: 'Usuario', permissions: [] })

    expect(result).toBeNull()
    expect(prismaMock.role.create).not.toHaveBeenCalled()
  })

  it('delete: bloquea roles de sistema', async () => {
    prismaMock.role.findUnique.mockResolvedValue(userRole)

    const result = await roleService.delete('r1')

    expect(result).toBe(false)
  })

  it('delete: demueve a user y elimina el rol', async () => {
    const custom = { id: 'r3', name: 'moderator', label: 'Moderador', permissions: ['moderate'], isSystem: false, createdAt: new Date() }
    prismaMock.role.findUnique.mockResolvedValue(custom)

    const result = await roleService.delete('r3')

    expect(result).toBe(true)
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({ where: { role: 'moderator' }, data: { role: 'user' } })
    expect(prismaMock.role.delete).toHaveBeenCalledWith({ where: { id: 'r3' } })
  })

  it('getPermissions: superadmin tiene todos los permisos aunque no esté en BD', async () => {
    prismaMock.role.findUnique.mockResolvedValue(null)

    const result = await roleService.getPermissions('superadmin')

    expect(result).toEqual([...ALL_PERMISSIONS])
  })

  it('getPermissions: rol custom devuelve sus permisos', async () => {
    prismaMock.role.findUnique.mockResolvedValue({ ...userRole, permissions: ['moderate'] })

    const result = await roleService.getPermissions('user')

    expect(result).toEqual(['moderate'])
  })

  it('seedDefaults: crea user y superadmin si no existen', async () => {
    prismaMock.role.createMany.mockResolvedValue({ count: 2 })

    const created = await roleService.seedDefaults()

    expect(created).toBe(2)
    expect(prismaMock.role.createMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.role.createMany).toHaveBeenCalledWith({
      data: [
        { name: 'user', label: 'Usuario', permissions: [], isSystem: true },
        { name: 'superadmin', label: 'Superadministrador', permissions: [...ALL_PERMISSIONS], isSystem: true },
      ],
      skipDuplicates: true,
    })
  })

  it('getPermissions: cachea la segunda consulta del mismo rol', async () => {
    prismaMock.role.findUnique.mockResolvedValue({ ...userRole, permissions: ['moderate'] })

    await roleService.getPermissions('user')
    await roleService.getPermissions('user')

    expect(prismaMock.role.findUnique).toHaveBeenCalledTimes(1)
  })

  it('update: invalida la caché de permisos', async () => {
    prismaMock.role.findUnique
      .mockResolvedValueOnce(userRole)
      .mockResolvedValueOnce({ ...userRole, permissions: ['moderate'] })

    await roleService.getPermissions('user')
    prismaMock.role.update.mockResolvedValue({ ...userRole, permissions: ['moderate'] })
    await roleService.update('r1', { permissions: ['moderate'] })
    const result = await roleService.getPermissions('user')

    expect(result).toEqual(['moderate'])
    expect(prismaMock.role.findUnique).toHaveBeenCalledTimes(2)
  })
})
