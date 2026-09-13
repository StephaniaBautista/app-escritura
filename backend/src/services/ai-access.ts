import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { ALL_PERMISSIONS } from './role-service.js'
import { AiServiceError } from './ai-types.js'

export type AiPermission = 'ai_chat' | 'ai_characters' | 'ai_suggestions'

export async function authorizeAi(projectId: string, userId: string, permission?: AiPermission) {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { role: true, status: true, suspendedUntil: true },
  })
  if (!user) throw new AiServiceError('UNAUTHORIZED', 401)
  const allowedStatus = user.status === 'active' || (user.status === 'suspended'
    && user.suspendedUntil !== null && user.suspendedUntil <= new Date())
  if (!allowedStatus) {
    throw new AiServiceError('FORBIDDEN', 403)
  }
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
  if (!project) throw new AiServiceError('NOT_FOUND', 404)
  const permissions = user.role === 'superadmin' ? [...ALL_PERMISSIONS]
    : (await prisma.role.findUnique({ where: { name: user.role }, select: { permissions: true } }))?.permissions ?? []
  if (permission && !permissions.includes(permission)) throw new AiServiceError('AI_PERMISSION_REQUIRED', 403)
  return { permissions, canCopy: user.role === 'superadmin' }
}

export interface AiGenerationBudget {
  signal: AbortSignal
  consumeRetry: () => Promise<void>
}

export async function withAiQuota<T>(userId: string, operation: (budget: AiGenerationBudget) => Promise<T>): Promise<T> {
  const now = new Date()
  const leaseToken = randomUUID()
  const available = { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] }
  await prisma.aiUsage.upsert({ where: { userId }, create: { userId }, update: {} })
  await prisma.aiUsage.updateMany({
    where: { userId, windowStartedAt: { lte: new Date(now.getTime() - 60_000) }, ...available },
    data: { requestCount: 0, windowStartedAt: now },
  })
  const acquired = await prisma.aiUsage.updateMany({
    where: { userId, requestCount: { lt: 10 }, ...available },
    data: { requestCount: { increment: 1 }, leaseUntil: new Date(now.getTime() + 210_000), leaseToken },
  })
  if (acquired.count !== 1) throw new AiServiceError('AI_RATE_LIMITED', 429)
  const controller = new AbortController()
  const remainingMs = Math.max(0, now.getTime() + 190_000 - Date.now())
  if (remainingMs === 0) controller.abort()
  const timer = setTimeout(() => { controller.abort() }, remainingMs)
  timer.unref()
  const consumeRetry = async () => {
    if (controller.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    const counted = await prisma.aiUsage.updateMany({
      where: { userId, leaseToken, leaseUntil: { gt: new Date() }, requestCount: { lt: 10 } },
      data: { requestCount: { increment: 1 } },
    })
    if (counted.count !== 1) throw new AiServiceError('AI_RATE_LIMITED', 429)
  }
  const release = () => prisma.aiUsage.updateMany({ where: { userId, leaseToken }, data: { leaseUntil: null, leaseToken: null } })
  let result: T
  try {
    if (controller.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    result = await operation({ signal: controller.signal, consumeRetry })
    if (controller.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
  } catch (error) {
    await release().catch(() => undefined)
    throw error
  } finally {
    clearTimeout(timer)
  }
  await release()
  return result
}
