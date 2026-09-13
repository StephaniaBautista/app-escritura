import type { Prisma } from '@generated/client'
import { normalizeTimeZone, splitActivityDays } from '../lib/stats-time.js'
import { writingTransaction } from '../lib/stats-transaction.js'
import { requireActiveWriter } from './stats-access.js'
import { StatsError, type WritingActivityInput } from './stats-types.js'

const SESSION_DURATION = 8 * 60 * 60 * 1000
const SESSION_LIMIT = 200

function receipt(session: { id: string; reportedMilliseconds: number; creditedMilliseconds: number; expiresAt: Date }, creditedMilliseconds = 0) {
  return { sessionId: session.id, acceptedMilliseconds: session.reportedMilliseconds, creditedMilliseconds,
    totalActiveMilliseconds: session.creditedMilliseconds, expiresAt: session.expiresAt.toISOString() }
}

async function addTime(tx: Prisma.TransactionClient, input: { userId: string; documentId: string; projectId: string; timeZone: string }, now: Date, credit: number) {
  for (const part of splitActivityDays(new Date(now.getTime() - credit), now, input.timeZone)) {
    await tx.writingStats.upsert({
      where: { userId_documentId_day: { userId: input.userId, documentId: input.documentId, day: part.day } },
      create: { userId: input.userId, documentId: input.documentId, projectId: input.projectId, day: part.day, activeMilliseconds: part.activeMilliseconds },
      update: { activeMilliseconds: { increment: part.activeMilliseconds } },
    })
  }
}

export const statsActivityService = {
  async report(userId: string, input: WritingActivityInput) {
    const timeZone = normalizeTimeZone(input.timeZone)
    return writingTransaction(async (tx) => {
      const now = new Date()
      await requireActiveWriter(tx, userId)
      const document = await tx.document.findFirst({ where: { id: input.documentId, userId, project: { userId } }, select: { id: true, projectId: true } })
      if (!document) throw new StatsError('NOT_FOUND', 404)
      let session = await tx.writingSession.findUnique({ where: { id: input.sessionId } })
      if (!session) {
        if (input.activeMilliseconds !== 0) throw new StatsError('STATS_SESSION_NOT_STARTED', 409)
        await tx.writingSession.deleteMany({ where: { userId, expiresAt: { lte: now } } })
        if (await tx.writingSession.count({ where: { userId, expiresAt: { gt: now } } }) >= SESSION_LIMIT) throw new StatsError('STATS_SESSION_LIMIT', 429)
        session = await tx.writingSession.create({ data: { id: input.sessionId, userId, documentId: document.id, projectId: document.projectId,
          timeZone, createdAt: now, lastReceivedAt: now, expiresAt: new Date(now.getTime() + SESSION_DURATION) } })
        await tx.writingActivityClock.upsert({ where: { userId }, create: { userId, lastCreditedAt: now }, update: {} })
        return receipt(session)
      }
      if (session.userId !== userId || session.documentId !== document.id || session.timeZone !== timeZone) throw new StatsError('STATS_SESSION_SCOPE_MISMATCH', 409)
      if (session.expiresAt <= now) throw new StatsError('STATS_SESSION_EXPIRED', 410)
      if (input.activeMilliseconds <= session.reportedMilliseconds) return receipt(session)
      const clock = await tx.writingActivityClock.upsert({ where: { userId }, create: { userId, lastCreditedAt: now }, update: {} })
      const elapsed = Math.max(0, now.getTime() - Math.max(session.lastReceivedAt.getTime(), clock.lastCreditedAt.getTime()))
      const credit = Math.min(input.activeMilliseconds - session.reportedMilliseconds, elapsed, 60_000)
      session = await tx.writingSession.update({ where: { id: session.id }, data: {
        reportedMilliseconds: input.activeMilliseconds, creditedMilliseconds: { increment: credit }, lastReceivedAt: now,
      } })
      if (credit > 0) {
        await tx.writingActivityClock.update({ where: { userId }, data: { lastCreditedAt: now } })
        await addTime(tx, { userId, documentId: document.id, projectId: session.projectId, timeZone }, now, credit)
      }
      return receipt(session, credit)
    })
  },
}
