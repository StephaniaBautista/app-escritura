import type { Prisma } from '@generated/client'
import { StatsError } from './stats-types.js'

export async function requireActiveWriter(db: Pick<Prisma.TransactionClient, 'user'>, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { status: true, suspendedUntil: true } })
  if (!user) throw new StatsError('UNAUTHORIZED', 401)
  const active = user.status === 'active' || (user.status === 'suspended' && user.suspendedUntil !== null && user.suspendedUntil <= new Date())
  if (!active) throw new StatsError('FORBIDDEN', 403)
}
