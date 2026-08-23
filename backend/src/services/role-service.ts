import { prisma } from '../lib/prisma.js'
import { MemoryCache } from '../lib/cache.js'

export const ALL_PERMISSIONS = ['admin', 'moderate'] as const
export type Permission = (typeof ALL_PERMISSIONS)[number]

const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000
const permissionsCache = new MemoryCache<string[]>({ defaultTtlMs: PERMISSIONS_CACHE_TTL_MS })

export interface RoleRow {
  id: string
  name: string
  label: string
  permissions: string[]
  isSystem: boolean
  createdAt: Date
}

export const roleService = {
  async list(): Promise<(RoleRow & { userCount: number })[]> {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })
    const counts = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } })
    const countByRole = Object.fromEntries(counts.map((c) => [c.role, c._count._all]))
    return roles.map((r) => ({ ...r, userCount: countByRole[r.name] ?? 0 }))
  },

  async findByName(name: string) {
    return prisma.role.findUnique({ where: { name } })
  },

  async create(data: { name: string; label: string; permissions: string[] }): Promise<RoleRow | null> {
    const existing = await prisma.role.findUnique({ where: { name: data.name } })
    if (existing) return null
    return prisma.role.create({
      data: { name: data.name, label: data.label, permissions: data.permissions, isSystem: false },
    })
  },

  async update(id: string, data: { label?: string; permissions?: string[] }): Promise<RoleRow | null> {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return null
    const updated = await prisma.role.update({ where: { id }, data })
    this.invalidate()
    return updated
  },

  async delete(id: string): Promise<boolean> {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.isSystem || role.name === 'user') return false

    await prisma.$transaction([
      prisma.user.updateMany({ where: { role: role.name }, data: { role: 'user' } }),
      prisma.role.delete({ where: { id } }),
    ])
    this.invalidate()
    return true
  },

  async getPermissions(roleName: string): Promise<string[]> {
    if (roleName === 'superadmin') return [...ALL_PERMISSIONS]
    const cached = permissionsCache.get(roleName)
    if (cached) return cached
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    const permissions = role?.permissions ?? []
    permissionsCache.set(roleName, permissions)
    return permissions
  },

  invalidate(): void {
    permissionsCache.clear()
  },

  async seedDefaults(): Promise<number> {
    const defaults: { name: string; label: string; permissions: string[] }[] = [
      { name: 'user', label: 'Usuario', permissions: [] },
      { name: 'superadmin', label: 'Superadministrador', permissions: [...ALL_PERMISSIONS] },
    ]
    const result = await prisma.role.createMany({
      data: defaults.map((d) => ({ ...d, isSystem: true })),
      skipDuplicates: true,
    })
    if (result.count > 0) this.invalidate()
    return result.count
  },
}
