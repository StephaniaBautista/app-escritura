import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), get: vi.fn(), report: vi.fn() }))
vi.mock('../../lib/session.js', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('../../services/stats-service.js', () => ({ statsService: { get: mocks.get } }))
vi.mock('../../services/stats-activity-service.js', () => ({ statsActivityService: { report: mocks.report } }))
import { statsRoutes } from '../stats.js'
import { StatsError } from '../../services/stats-types.js'

let app: FastifyInstance
const body = { documentId: 'doc', sessionId: '34ec60bf-c51d-46b1-b6a0-836ced70e9df', activeMilliseconds: 0, timeZone: 'UTC' }
const summary = { totalWords: 1, wordsAdded: 0, activeSeconds: 0, activeDays: 0, currentStreak: 0, longestStreak: 0, dailyAverage: 0, todayWords: 0 }
beforeEach(async () => {
  vi.resetAllMocks()
  mocks.getSessionUser.mockResolvedValue({ id: 'user' })
  mocks.get.mockResolvedValue({ timeZone: 'UTC', today: '2026-09-12', trackedSince: null, range: { from: '2026-08-14', to: '2026-09-12' }, summary, days: [], projects: [], documents: [], secret: 'must-not-leak' })
  mocks.report.mockResolvedValue({ sessionId: body.sessionId, acceptedMilliseconds: 0, creditedMilliseconds: 0, totalActiveMilliseconds: 0, expiresAt: '2026-09-12T20:00:00.000Z' })
  app = Fastify()
  await app.register(statsRoutes, { prefix: '/api' })
  await app.ready()
})
afterEach(async () => { await app.close() })

describe('statistics HTTP contract', () => {
  it('requires Better Auth session for both routes', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const get = await app.inject({ url: '/api/stats' })
    const post = await app.inject({ method: 'POST', url: '/api/stats/activity', payload: body })
    expect([get.statusCode, post.statusCode]).toEqual([401, 401])
    expect(get.json()).toEqual({ error: 'UNAUTHORIZED' })
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.report).not.toHaveBeenCalled()
  })
  it('coerces supported ranges and serializes only the public response contract', async () => {
    const response = await app.inject({ url: '/api/stats?days=30&timeZone=UTC&documentId=doc' })
    expect(response.statusCode).toBe(200)
    expect(mocks.get).toHaveBeenCalledWith('user', { days: 30, timeZone: 'UTC', documentId: 'doc' })
    expect(response.json().summary).toEqual(summary)
    expect(response.body).not.toContain('secret')
  })
  it('defaults the range to 365 days', async () => {
    await app.inject({ url: '/api/stats' })
    expect(mocks.get).toHaveBeenCalledWith('user', { days: 365 })
  })
  it.each(['days=31', 'days=-1', 'days=100000', 'documentId=', 'timeZone='])('rejects malformed query %s', async (query) => {
    expect((await app.inject({ url: `/api/stats?${query}` })).statusCode).toBe(400)
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it.each([{ sessionId: 'invalid' }, { activeMilliseconds: -1 }, { activeMilliseconds: 28_800_001 }, { activeMilliseconds: 1.5 }, { timeZone: '' }])('validates activity input %j', async (invalid) => {
    expect((await app.inject({ method: 'POST', url: '/api/stats/activity', payload: { ...body, ...invalid } })).statusCode).toBe(400)
    expect(mocks.report).not.toHaveBeenCalled()
  })
  it('does not accept client word totals as part of the activity contract', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/stats/activity', payload: { ...body, wordsAdded: 9000, userId: 'foreign' } })).statusCode).toBe(200)
    expect(mocks.report).toHaveBeenCalledWith('user', body)
  })
  it.each([403, 404, 409, 410, 429])('preserves safe service status %s', async (status) => {
    mocks.report.mockRejectedValue(new StatsError('SAFE_CODE', status))
    const response = await app.inject({ method: 'POST', url: '/api/stats/activity', payload: body })
    expect(response.statusCode).toBe(status)
    expect(response.json()).toEqual({ error: 'SAFE_CODE' })
  })
  it('sanitizes internal database failures', async () => {
    mocks.get.mockRejectedValue(Object.assign(new Error('private document body database secret'), { code: 'P1001' }))
    const response = await app.inject({ url: '/api/stats' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: 'STATS_REQUEST_FAILED' })
    expect(response.body).not.toContain('private')
  })
})
