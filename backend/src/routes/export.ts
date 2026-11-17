import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { ExportError, exportService, type ExportRequest } from '../services/export-service.js'
import { DEFAULT_AO3_OPTIONS } from '../lib/tiptap-export.js'

const ao3Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fontFamily: { type: 'string', enum: ['serif', 'sans', 'mono'] },
    fontSize: { type: 'number', minimum: 10, maximum: 24 },
    lineSpacing: { type: 'number', minimum: 1, maximum: 2.5 },
    paragraphStyle: { type: 'string', enum: ['block', 'indent'] },
    sceneSeparator: { type: 'string', maxLength: 40 },
    includeTitle: { type: 'boolean' },
  },
}

export async function exportRoutes(app: FastifyInstance) {
  app.post('/documents/:id/export', {
    schema: {
      description: 'Export a document (optionally with its children) as Markdown, HTML, AO3 HTML, or PDF.',
      tags: ['Export'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['md', 'html', 'ao3', 'pdf'] },
          includeChildren: { type: 'boolean', default: false },
          ao3: ao3Schema,
        },
      },
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })
    }

    const { id } = request.params as { id: string }
    const body = request.body as ExportRequest

    try {
      const result = await exportService.exportDocument(user.id, id, {
        format: body.format,
        includeChildren: body.includeChildren === true,
        ao3: { ...DEFAULT_AO3_OPTIONS, ...body.ao3 },
      })
      return reply
        .header('Content-Type', result.contentType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.body)
    } catch (error) {
      if (error instanceof ExportError) {
        return reply.status(error.statusCode).send({
          error: { code: error.code, message: error.message },
        })
      }
      request.log.error({ documentId: id, format: body.format }, 'export failed')
      return reply.status(500).send({
        error: { code: 'EXPORT_FAILED', message: 'No se pudo exportar el documento' },
      })
    }
  })
}
