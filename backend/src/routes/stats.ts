import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { statsErrorDetails } from '../lib/stats-errors.js'
import { getSessionUser } from '../lib/session.js'
import { statsService } from '../services/stats-service.js'
import { statsActivityService } from '../services/stats-activity-service.js'
import { StatsError, type StatsQuery, type WritingActivityInput } from '../services/stats-types.js'
import { statsActivityBody, statsActivityResponse, statsErrors, statsQuery, statsResponse } from './stats-schemas.js'

async function authenticated(request: FastifyRequest, reply: FastifyReply, run: (userId: string) => Promise<unknown>) {
  try {
    const user = await getSessionUser(request)
    if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    return await run(user.id)
  } catch (error) {
    if (error instanceof StatsError) return reply.code(error.statusCode).send({ error: error.code })
    request.log.error({ operation: 'stats', ...statsErrorDetails(error) }, 'Statistics request failed')
    return reply.code(500).send({ error: 'STATS_REQUEST_FAILED' })
  }
}

export async function statsRoutes(app: FastifyInstance) {
  const common = { tags: ['Statistics'], security: [{ cookieAuth: [] }] }
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error.validation) return reply.code(400).send({ error: 'STATS_INVALID_INPUT' })
    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({ error: 'STATS_REQUEST_FAILED' })
  })
  app.get('/stats', { schema: { ...common,
    description: 'Read current word totals and historical writing activity for owned account, project, or current document subtree. Streaks use all tracked history; deleted documents retain account/project activity.',
    querystring: statsQuery, response: { 200: statsResponse, ...statsErrors },
  } }, (request, reply) => authenticated(request, reply, (userId) => statsService.get(userId, request.query as StatsQuery)))
  app.post('/stats/activity', { bodyLimit: 2048, schema: { ...common,
    description: 'Report cumulative active editor milliseconds. First report must be zero; server time, a 60-second report cap and a shared user watermark prevent replay or overlapping-tab inflation. Sessions expire after eight hours.',
    body: statsActivityBody, response: { 200: statsActivityResponse, ...statsErrors },
  } }, (request, reply) => authenticated(request, reply, (userId) => statsActivityService.report(userId, request.body as WritingActivityInput)))
}
