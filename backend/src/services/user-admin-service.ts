import { prisma } from '../lib/prisma.js'
import { roleService } from './role-service.js'

export type UserStatus = 'active' | 'suspended' | 'banned'

export const USER_STATUSES: UserStatus[] = ['active', 'suspended', 'banned']

async function isProtectedTarget(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) return false
  const permissions = await roleService.getPermissions(target.role ?? 'user')
  return permissions.includes('admin')
}

export const userAdminService = {
  async setStatus(
    actorId: string,
    targetId: string,
    input: { status: UserStatus; until?: string | null },
  ): Promise<{ ok: true } | { ok: false; reason: 'not-found' | 'self-target' | 'protected-admin' | 'invalid-until' }> {
    if (actorId === targetId) {
      return { ok: false, reason: 'self-target' }
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) return { ok: false, reason: 'not-found' }

    const protectedAdmin = await isProtectedTarget(targetId)
    if (protectedAdmin) return { ok: false, reason: 'protected-admin' }

    const now = new Date()
    let until: Date | null = null
    if (input.status === 'suspended') {
      if (!input.until || isNaN(new Date(input.until).getTime())) {
        return { ok: false, reason: 'invalid-until' }
      }
      until = new Date(input.until)
      if (until <= now) {
        return { ok: false, reason: 'invalid-until' }
      }
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { status: input.status, suspendedUntil: until },
    })

    if (input.status !== 'active') {
      await prisma.session.deleteMany({ where: { userId: targetId } })
    }

    return { ok: true }
  },

  async deleteUser(actorId: string, targetId: string): Promise<{ ok: true } | { ok: false; reason: 'not-found' | 'self-target' | 'protected-admin' }> {
    if (actorId === targetId) {
      return { ok: false, reason: 'self-target' }
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) return { ok: false, reason: 'not-found' }

    const protectedAdmin = await isProtectedTarget(targetId)
    if (protectedAdmin) return { ok: false, reason: 'protected-admin' }

    await prisma.user.delete({ where: { id: targetId } })
    return { ok: true }
  },

  async findForLogin(email: string) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, status: true, suspendedUntil: true },
    })
  },

  isBlocked(status: string | null | undefined, suspendedUntil: Date | null | undefined): { blocked: boolean; reason: 'banned' | 'suspended' | null } {
    if (status === 'banned') return { blocked: true, reason: 'banned' }
    if (status === 'suspended') {
      if (!suspendedUntil || new Date(suspendedUntil).getTime() > Date.now()) {
        return { blocked: true, reason: 'suspended' }
      }
    }
    return { blocked: false, reason: null }
  },
}
