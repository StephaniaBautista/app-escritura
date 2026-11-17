import type { FastifyInstance } from 'fastify'
import { requirePermission } from '../lib/session.js'
import { probeWebSearch } from '../lib/ai-web-search.js'
import { adminAiUsageService } from '../services/admin-ai-usage-service.js'

const dateQuery = { type: 'string', format: 'date-time' } as const
const totals = {
  type: 'object',
  properties: {
    requests: { type: 'integer' },
    promptTokens: { type: 'integer' },
    completionTokens: { type: 'integer' },
    totalTokens: { type: 'integer' },
    estimatedUsd: { type: 'number' },
  },
  required: ['requests', 'promptTokens', 'completionTokens', 'totalTokens', 'estimatedUsd'],
  additionalProperties: false,
} as const
const dayRow = {
  type: 'object',
  properties: {
    date: { type: 'string' },
    ...totals.properties,
  },
  required: ['date', 'requests', 'promptTokens', 'completionTokens', 'totalTokens', 'estimatedUsd'],
  additionalProperties: false,
} as const

export async function adminAiUsageRoutes(app: FastifyInstance) {
  app.get('/admin/ai-usage', {
    schema: {
      description: 'Aggregate AI token usage and estimated spend by vendor, model and day (admin).',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: { from: dateQuery, to: dateQuery },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            totals,
            models: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vendor: { type: 'string' },
                  model: { type: 'string' },
                  preset: { type: 'string' },
                  ...totals.properties,
                },
                required: ['vendor', 'model', 'preset', 'requests', 'promptTokens', 'completionTokens', 'totalTokens', 'estimatedUsd'],
                additionalProperties: false,
              },
            },
            days: { type: 'array', items: dayRow },
          },
          required: ['from', 'to', 'totals', 'models', 'days'],
          additionalProperties: false,
        },
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return
    const query = request.query as { from?: string; to?: string }
    try {
      return await adminAiUsageService.report(query.from, query.to)
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_RANGE') {
        return reply.code(400).send({ error: { code: 'INVALID_RANGE', message: 'Rango de fechas inválido' } })
      }
      throw error
    }
  })

  app.get('/admin/ai-web-search', {
    schema: {
      description: 'Check whether adviser web search is configured and reachable (admin). Never returns API keys or search snippets.',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            engine: { type: 'string', enum: ['brave', 'duckduckgo'] },
            keyConfigured: { type: 'boolean' },
            ok: { type: 'boolean' },
            status: { type: ['integer', 'null'] },
            hits: { type: 'integer' },
          },
          required: ['engine', 'keyConfigured', 'ok', 'status', 'hits'],
          additionalProperties: false,
        },
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'admin')
    if (!user) return
    return probeWebSearch()
  })
}
