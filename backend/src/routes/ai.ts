import type { FastifyInstance, FastifyReply, FastifyRequest, FastifyError } from 'fastify'
import { getSessionUser } from '../lib/session.js'
import { AiClientError } from '../lib/ai-client.js'
import { RagContextError } from '../lib/rag-service.js'
import { aiService } from '../services/ai-service.js'
import type { AiWizardInput } from '../services/ai-wizard.js'
import type { AiCharacterFillInput } from '../services/ai-character-fill.js'
import type { AiTimelineFillInput } from '../services/ai-timeline-fill.js'
import { registerAiRetention } from './ai-retention.js'
import { aiErrorDetails } from './ai-error-details.js'
import { AiServiceError, type AiMessageInput, type AiSuggestionInput, type CreateAiConversation } from '../services/ai-types.js'
import {
  aiParams, aiConversationParams, aiErrors, capabilitiesSchema, conversationSchema,
  conversationDetailSchema, createConversationBody, messageBody, suggestionBodies, suggestionsSchema, turnSchema, tagSuggestionsSchema, wizardCompletionBody, wizardCompletionSchema, wizardGenerationBody, characterFillBody, characterFillSchema, timelineFillBody, timelineFillSchema,
} from './ai-schemas.js'

interface Params { projectId: string; id: string }

async function authenticated(request: FastifyRequest, reply: FastifyReply, run: (userId: string, params: Params) => Promise<unknown>) {
  try {
    const user = await getSessionUser(request)
    if (!user) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    return await run(user.id, request.params as Params)
  } catch (error) {
    if (error instanceof AiServiceError || error instanceof AiClientError || error instanceof RagContextError) {
      if (error.code === 'AI_INVALID_RESPONSE') {
        request.log.warn({ operation: 'ai', ...aiErrorDetails(error) }, 'AI response rejected')
      }
      return reply.code(error.statusCode).send({ error: error.code })
    }
    request.log.error({ operation: 'ai', ...aiErrorDetails(error) }, 'AI request failed')
    return reply.code(500).send({ error: 'AI_REQUEST_FAILED' })
  }
}

export async function aiRoutes(app: FastifyInstance) {
  registerAiRetention(app)
  const base = '/projects/:projectId/ai'
  const common = { tags: ['AI'], security: [{ cookieAuth: [] }] }
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error.validation) return reply.code(400).send({ error: 'AI_INVALID_INPUT' })
    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({ error: 'AI_REQUEST_FAILED' })
  })
  app.get(`${base}/capabilities`, { schema: { ...common,
    description: 'Available configured AI providers and current role permissions; keys are never exposed.', params: aiParams,
    response: { 200: capabilitiesSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.capabilities(projectId, userId)))
  app.get(`${base}/conversations`, { schema: { ...common,
    description: 'List up to 100 owned conversations. History expires after 90 days.', params: aiParams,
    response: { 200: { type: 'array', items: conversationSchema }, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.list(projectId, userId)))
  app.post(`${base}/conversations`, { schema: { ...common,
    description: 'Create owned adviser or character conversation with immutable character/chapter knowledge scope.',
    params: aiParams, body: createConversationBody, response: { 201: conversationSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, async (userId, { projectId }) => {
    const conversation = await aiService.create(projectId, userId, request.body as CreateAiConversation)
    return reply.code(201).send(conversation)
  }))
  app.get(`${base}/conversations/:id`, { schema: { ...common,
    description: 'Read own conversation and at most 200 messages. Rechecks current AI permission.',
    params: aiConversationParams, response: { 200: conversationDetailSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId, id }) => aiService.get(projectId, userId, id)))
  app.delete(`${base}/conversations/:id`, { schema: { ...common,
    description: 'Delete an owned conversation and all its messages, including after permission revocation.',
    params: aiConversationParams, response: { 204: { type: 'null' }, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, async (userId, { projectId, id }) => {
    await aiService.remove(projectId, userId, id)
    return reply.code(204).send()
  }))
  app.post(`${base}/conversations/:id/messages`, { bodyLimit: 20_000, schema: { ...common,
    description: 'Request read-only advice or character reply. requestId identifies an idempotent turn. At most 10 provider attempts per user per minute; requests are serialized across processes. No prose generation or document writes.',
    params: aiConversationParams, body: messageBody, response: { 200: turnSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId, id }) => aiService.send(projectId, userId, id, request.body as AiMessageInput)))
  app.post(`${base}/wizard-completion`, { bodyLimit: 4_000, schema: { ...common,
    description: 'Complete or suggest improvements for one wizard stage from written documents. Empty or thin fields may be completed; solid fields return suggestions. type and ships are included on their stages. Repeatable. Empty manuscripts never call a provider. Does not persist project metadata.',
    params: aiParams, body: wizardCompletionBody, response: { 200: wizardCompletionSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.completeWizard(projectId, userId, request.body as AiWizardInput)))
  app.post(`${base}/tag-suggestions`, { bodyLimit: 4_000, schema: { ...common,
    description: 'Suggest AO3-style story tags from the manuscript. Does not persist tags. Empty manuscripts never call a provider. Allowed when the wizard is already complete.',
    params: aiParams, body: wizardGenerationBody, response: { 200: tagSuggestionsSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.suggestTags(projectId, userId, request.body as AiWizardInput)))
  app.post(`${base}/character-fill`, { bodyLimit: 4_000, schema: { ...common,
    description: 'Create or complete character sheets from written documents. Empty or insufficient manuscripts never call a provider. Does not persist characters.',
    params: aiParams, body: characterFillBody, response: { 200: characterFillSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.fillCharacters(projectId, userId, request.body as AiCharacterFillInput)))
  app.post(`${base}/timeline-fill`, { bodyLimit: 4_000, schema: { ...common,
    description: 'Create or complete timeline eras and events from written documents, up to 50 of each. Empty or insufficient manuscripts never call a provider. Does not persist timeline rows.',
    params: aiParams, body: timelineFillBody, response: { 200: timelineFillSchema, ...aiErrors },
  } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.fillTimeline(projectId, userId, request.body as AiTimelineFillInput)))
  for (const [path, kind] of [['suggestions', 'editor'], ['character-suggestions', 'character'], ['subplot-suggestions', 'subplot'], ['structure-suggestions', 'structure']] as const) {
    app.post(`${base}/${path}`, { bodyLimit: 64_000, schema: { ...common,
      description: 'Return validated, source-grounded suggestions without mutating any document, character or subplot. Exact quotes reference supplied document excerpts; character fields require explicit user application through existing CRUD.',
      params: aiParams, body: suggestionBodies[kind], response: { 200: suggestionsSchema, ...aiErrors },
    } }, (request, reply) => authenticated(request, reply, (userId, { projectId }) => aiService.suggest(projectId, userId, kind, request.body as AiSuggestionInput)))
  }
}
