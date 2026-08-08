import type { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { i18nService } from '../services/i18n-service.js'

export async function i18nRoutes(app: FastifyInstance) {
  app.get('/i18n/:lng/:ns', {
    schema: {
      description: 'Get a translation namespace for a language (public, cached)',
      tags: ['i18n'],
      params: {
        type: 'object',
        properties: {
          lng: { type: 'string', enum: i18nService.getSupportedLanguages() },
          ns: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
        },
        required: ['lng', 'ns'],
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          description: 'Translation namespace object',
        },
        304: {
          description: 'Not modified (If-None-Match matched)',
          type: 'object',
          additionalProperties: true,
        },
        404: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { lng, ns } = request.params as { lng: string; ns: string }
    const data = i18nService.getNamespace(lng, ns)
    if (data === null) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Traducción no encontrada' } })
    }

    const body = JSON.stringify(data)
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`

    if (request.headers['if-none-match'] === etag) {
      return reply.status(304).send()
    }

    const isProd = process.env.NODE_ENV === 'production'
    return reply
      .header('Cache-Control', isProd ? 'public, max-age=3600' : 'no-cache')
      .header('ETag', etag)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(body)
  })
}
