import type { FastifyInstance } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import {
  extractTextFromImage,
  extractTextFromPdf,
  isAllowedOcrMime,
  maxOcrBytesForMime,
} from '../services/ocr-service.js'

const auth = [{ cookieAuth: [] }]

export async function ocrRoutes(app: FastifyInstance) {
  app.post('/ocr', {
    schema: {
      description: 'Extraer texto de una imagen o PDF escaneado vía OCR',
      tags: ['OCR'],
      security: auth,
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          required: ['text'],
          properties: { text: { type: 'string' } },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        413: { type: 'object', properties: { error: { type: 'string' } } },
        415: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: async (request, reply) => {
      const user = await getSessionUser(request)
      if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })

      const file = await request.file()
      if (!file) return reply.code(400).send({ error: 'NO_FILE' })

      const mime = file.mimetype
      if (!isAllowedOcrMime(mime)) {
        return reply.code(415).send({ error: 'UNSUPPORTED_TYPE' })
      }

      const buffer = await file.toBuffer()
      if (buffer.length > maxOcrBytesForMime(mime)) {
        return reply.code(413).send({ error: 'FILE_TOO_LARGE' })
      }

      const text = mime === 'application/pdf'
        ? await extractTextFromPdf(buffer)
        : await extractTextFromImage(buffer)

      return { text }
    },
  })
}
