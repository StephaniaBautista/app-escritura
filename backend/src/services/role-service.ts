import { prisma } from '../lib/prisma.js'

export const ALL_PERMISSIONS = ['admin', 'moderate'] as const
export type Permission = (typeof ALL_PERMISSIONS)[number]

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
    return prisma.role.update({ where: { id }, data })
  },

  async delete(id: string): Promise<boolean> {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.isSystem || role.name === 'user') return false

    await prisma.$transaction([
      prisma.user.updateMany({ where: { role: role.name }, data: { role: 'user' } }),
      prisma.role.delete({ where: { id } }),
    ])
    return true
  },

  async getPermissions(roleName: string): Promise<string[]> {
    if (roleName === 'superadmin') return [...ALL_PERMISSIONS]
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    return role?.permissions ?? []
  },

  async seedDefaults(): Promise<number> {
    const defaults: { name: string; label: string; permissions: string[] }[] = [
      { name: 'user', label: 'Usuario', permissions: [] },
      { name: 'superadmin', label: 'Superadministrador', permissions: [...ALL_PERMISSIONS] },
    ]
    let created = 0
    for (const d of defaults) {
      const exists = await prisma.role.findUnique({ where: { name: d.name } })
      if (!exists) {
        await prisma.role.create({ data: { ...d, isSystem: true } })
        created++
      }
    }
    return created
  },
}
