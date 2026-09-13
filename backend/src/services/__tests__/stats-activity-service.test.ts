import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WritingSession } from '@generated/client'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() }, document: { findFirst: vi.fn() }, writingStats: { upsert: vi.fn() }, $transaction: vi.fn(),
  writingSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  writingActivityClock: { upsert: vi.fn(), update: vi.fn() },
}))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
import { statsActivityService } from '../stats-activity-service.js'

let sessions: Map<string, WritingSession>
let watermark: Date | undefined
const start = new Date('2026-09-12T12:00:00Z')
const report = (activeMilliseconds = 0, sessionId = 'session-a', extras = {}) => statsActivityService.report('user', { documentId: 'doc', sessionId, activeMilliseconds, timeZone: 'UTC', ...extras })
const advance = (milliseconds: number) => vi.setSystemTime(new Date(start.getTime() + milliseconds))

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(start)
  sessions = new Map()
  watermark = undefined
  db.$transaction.mockImplementation((run) => run(db))
  db.user.findUnique.mockResolvedValue({ status: 'active', suspendedUntil: null })
  db.document.findFirst.mockResolvedValue({ id: 'doc', projectId: 'project' })
  db.writingSession.findUnique.mockImplementation(({ where }) => Promise.resolve(sessions.get(where.id) ?? null))
  db.writingSession.count.mockResolvedValue(0)
  db.writingSession.create.mockImplementation(({ data }) => {
    const session = { ...data, reportedMilliseconds: 0, creditedMilliseconds: 0 } as WritingSession
    sessions.set(session.id, session)
    return Promise.resolve(session)
  })
  db.writingSession.update.mockImplementation(({ where, data }) => {
    const old = sessions.get(where.id)!
    const session = { ...old, ...data, creditedMilliseconds: old.creditedMilliseconds + data.creditedMilliseconds.increment } as WritingSession
    sessions.set(session.id, session)
    return Promise.resolve(session)
  })
  db.writingActivityClock.upsert.mockImplementation(({ create }) => {
    watermark ??= create.lastCreditedAt
    return Promise.resolve({ userId: 'user', lastCreditedAt: watermark })
  })
  db.writingActivityClock.update.mockImplementation(({ data }) => { watermark = data.lastCreditedAt; return Promise.resolve(data) })
})
afterEach(() => { vi.useRealTimers() })

describe('bounded cumulative writing time', () => {
  it('requires a zero handshake and records no time for opening', async () => {
    await expect(report(1)).rejects.toMatchObject({ code: 'STATS_SESSION_NOT_STARTED' })
    expect(await report()).toMatchObject({ acceptedMilliseconds: 0, creditedMilliseconds: 0, totalActiveMilliseconds: 0, expiresAt: '2026-09-12T20:00:00.000Z' })
    expect(db.writingStats.upsert).not.toHaveBeenCalled()
  })
  it('credits elapsed time and keeps replay receipts idempotentent', async () => {
    await report()
    advance(15_000)
    expect(await report(15_000)).toMatchObject({ acceptedMilliseconds: 15_000, creditedMilliseconds: 15_000, totalActiveMilliseconds: 15_000 })
    const updates = db.writingActivityClock.update.mock.calls.length
    advance(30_000)
    expect(await report(15_000)).toMatchObject({ creditedMilliseconds: 0, totalActiveMilliseconds: 15_000 })
    expect(await report(10_000)).toMatchObject({ acceptedMilliseconds: 15_000, creditedMilliseconds: 0 })
    expect(db.writingActivityClock.update).toHaveBeenCalledTimes(updates)
    expect(sessions.get('session-a')?.lastReceivedAt).toEqual(new Date(start.getTime() + 15_000))
  })
  it('does not reset the handshake or consume another session time on replay', async () => {
    await report()
    await report(0, 'session-b')
    advance(15_000)
    await report(0)
    expect(sessions.get('session-a')?.lastReceivedAt).toEqual(start)
    expect(watermark).toEqual(start)
    expect(await report(15_000, 'session-b')).toMatchObject({ creditedMilliseconds: 15_000 })
  })
  it('limits credit to server time and does not bank excessive claims', async () => {
    await report()
    advance(5000)
    expect(await report(500_000)).toMatchObject({ creditedMilliseconds: 5000, acceptedMilliseconds: 500_000 })
    advance(10_000)
    expect(await report(500_001)).toMatchObject({ creditedMilliseconds: 1, totalActiveMilliseconds: 5001 })
  })
  it('caps each report at sixty seconds even after a long absence', async () => {
    await report()
    advance(120_000)
    expect(await report(120_000)).toMatchObject({ creditedMilliseconds: 60_000 })
  })
  it('never credits more than elapsed wall time across overlapping tabs', async () => {
    await report()
    await report(0, 'session-b')
    advance(15_000)
    const a = await report(15_000)
    const b = await report(15_000, 'session-b')
    advance(30_000)
    const c = await report(30_000, 'session-b')
    const d = await report(30_000)
    expect(a.creditedMilliseconds + b.creditedMilliseconds + c.creditedMilliseconds + d.creditedMilliseconds).toBe(30_000)
  })
  it('splits a credited interval at midnight in the session time zone', async () => {
    vi.setSystemTime(new Date('2026-09-12T05:59:50Z'))
    await report(0, 'session-a', { timeZone: 'America/Mexico_City' })
    vi.setSystemTime(new Date('2026-09-12T06:00:05Z'))
    await report(15_000, 'session-a', { timeZone: 'America/Mexico_City' })
    expect(db.writingStats.upsert.mock.calls.map(([argument]) => [argument.create.day, argument.create.activeMilliseconds])).toEqual([
      ['2026-09-11', 10_000], ['2026-09-12', 5000],
    ])
  })
  it('expires sessions and rejects timezone/document/user reuse', async () => {
    await report()
    await expect(report(1000, 'session-a', { timeZone: 'Asia/Tokyo' })).rejects.toMatchObject({ code: 'STATS_SESSION_SCOPE_MISMATCH' })
    db.document.findFirst.mockResolvedValueOnce({ id: 'other', projectId: 'project' })
    await expect(report(1000, 'session-a', { documentId: 'other' })).rejects.toMatchObject({ code: 'STATS_SESSION_SCOPE_MISMATCH' })
    sessions.set('session-a', { ...sessions.get('session-a')!, userId: 'foreign' })
    await expect(report(1000)).rejects.toMatchObject({ code: 'STATS_SESSION_SCOPE_MISMATCH' })
    sessions.set('session-a', { ...sessions.get('session-a')!, userId: 'user' })
    advance(8 * 60 * 60 * 1000)
    await expect(report(1000)).rejects.toMatchObject({ code: 'STATS_SESSION_EXPIRED' })
  })
  it('checks fresh account status and ownership before opening a session', async () => {
    db.user.findUnique.mockResolvedValueOnce({ status: 'suspended', suspendedUntil: null })
    await expect(report()).rejects.toMatchObject({ statusCode: 403 })
    db.document.findFirst.mockResolvedValueOnce(null)
    await expect(report()).rejects.toMatchObject({ statusCode: 404 })
    expect(db.writingSession.create).not.toHaveBeenCalled()
  })
  it('accepts expired suspensions and rejects missing users', async () => {
    db.user.findUnique.mockResolvedValueOnce({ status: 'suspended', suspendedUntil: new Date(start.getTime() - 1) })
    await report()
    db.user.findUnique.mockResolvedValueOnce(null)
    await expect(report()).rejects.toMatchObject({ statusCode: 401 })
  })
  it('caps active sessions without changing existing session state', async () => {
    db.writingSession.count.mockResolvedValue(200)
    await expect(report()).rejects.toMatchObject({ code: 'STATS_SESSION_LIMIT', statusCode: 429 })
    expect(db.writingSession.create).not.toHaveBeenCalled()
  })
  it('retains the historical project from the session after a document move', async () => {
    await report()
    advance(15_000)
    db.document.findFirst.mockResolvedValue({ id: 'doc', projectId: 'moved-project' })
    await report(15_000)
    expect(db.writingStats.upsert.mock.calls[0]![0].create.projectId).toBe('project')
  })
})
