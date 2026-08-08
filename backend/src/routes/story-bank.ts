import type { FastifyInstance } from 'fastify'
import { getSessionUser, requirePermission } from '../lib/session.js'
import { storyBankService, type TemplateSection } from '../services/story-bank-service.js'

const MAX_QUESTION_TEXT = 500

export async function storyBankRoutes(app: FastifyInstance) {
  app.get('/story-questions', {
    schema: {
      description: 'List all questions from the guided-mode question bank',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return storyBankService.listQuestions()
  })

  app.post('/story-questions', {
    schema: {
      description: 'Create a question in the bank (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', minLength: 1, maxLength: MAX_QUESTION_TEXT },
          textEn: { type: 'string', maxLength: MAX_QUESTION_TEXT },
        },
        required: ['text'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { text, textEn } = request.body as { text: string; textEn?: string }
    const question = await storyBankService.createQuestion(text.trim(), textEn)

    return reply.status(201).send(question)
  })

  app.patch('/story-questions/:id', {
    schema: {
      description: 'Update a question in the bank (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', minLength: 1, maxLength: MAX_QUESTION_TEXT },
          textEn: { type: ['string', 'null'], maxLength: MAX_QUESTION_TEXT },
        },
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const body = request.body as { text?: string; textEn?: string | null }
    const updated = await storyBankService.updateQuestion(id, body)
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pregunta no encontrada' } })
    }

    return updated
  })

  app.delete('/story-questions/:id', {
    schema: {
      description: 'Delete a question from the bank (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const deleted = await storyBankService.deleteQuestion(id)
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Pregunta no encontrada' } })
    }

    return { ok: true }
  })

  app.get('/story-templates', {
    schema: {
      description: 'List all structure templates',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const user = await getSessionUser(request)
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } })

    return storyBankService.listTemplates()
  })

  app.post('/story-templates', {
    schema: {
      description: 'Create a structure template (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          nameEn: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          descriptionEn: { type: 'string', maxLength: 500 },
          sections: {
            type: 'array',
            maxItems: 12,
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                titleEn: { type: 'string' },
                questionIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        required: ['name', 'sections'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const body = request.body as { name: string; nameEn?: string; description?: string; descriptionEn?: string; sections: TemplateSection[] }
    const template = await storyBankService.createTemplate({
      name: body.name.trim(),
      nameEn: body.nameEn,
      description: body.description,
      descriptionEn: body.descriptionEn,
      sections: body.sections,
    })

    return reply.status(201).send(template)
  })

  app.patch('/story-templates/:id', {
    schema: {
      description: 'Update a structure template (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          nameEn: { type: ['string', 'null'], maxLength: 200 },
          description: { type: ['string', 'null'], maxLength: 500 },
          descriptionEn: { type: ['string', 'null'], maxLength: 500 },
          sections: {
            type: 'array',
            maxItems: 12,
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                titleEn: { type: 'string' },
                questionIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const body = request.body as Partial<{ name: string; nameEn?: string | null; description?: string | null; descriptionEn?: string | null; sections: TemplateSection[] }>
    const updated = await storyBankService.updateTemplate(id, body)
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Plantilla no encontrada' } })
    }

    return updated
  })

  app.delete('/story-templates/:id', {
    schema: {
      description: 'Delete a structure template (moderate)',
      tags: ['Story Bank'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const user = await requirePermission(request, reply, 'moderate')
    if (!user) return

    const { id } = request.params as { id: string }
    const deleted = await storyBankService.deleteTemplate(id)
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Plantilla no encontrada' } })
    }

    return { ok: true }
  })
}
