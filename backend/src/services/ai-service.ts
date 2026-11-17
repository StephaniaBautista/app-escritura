import { createHash } from 'node:crypto'
import type { AiConversation, AiMessage as StoredMessage } from '@generated/client'
import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'
import { aiClient, type AiProvider } from '../lib/ai-client.js'
import { presetOrDefault } from '../lib/ai-presets.js'
import { ragService } from '../lib/rag-service.js'
import { searchWebEvidence } from '../lib/ai-web-search.js'
import { AI_ADVISER_INSTRUCTIONS, AI_APP_ONLY_INSTRUCTIONS, AI_CHARACTER_INSTRUCTIONS, AI_WEB_SEARCH_INSTRUCTIONS, assessWritingRequest } from './ai-guard.js'
import { authorizeAi, withAiQuota, type AiGenerationBudget } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { parseChatResponse, parseSuggestions, suggestionInstructions } from './ai-output.js'
import { completeWizard as fillWizardFromDocuments, projectWordCount } from './ai-wizard.js'
import { suggestTags as suggestStoryTags } from './ai-tag-suggestions.js'
import { fillCharacters as fillCharactersFromDocuments } from './ai-character-fill.js'
import { fillTimeline as fillTimelineFromDocuments } from './ai-timeline-fill.js'
import { assertManuscriptEligible } from './ai-wizard-eligibility.js'
import { AiServiceError, type AiMessageInput, type AiMode, type AiSuggestionInput, type CreateAiConversation } from './ai-types.js'

const retentionMs = 90 * 24 * 60 * 60 * 1000
const messageSelect = {
  id: true, role: true, content: true, sources: true, provider: true, model: true, createdAt: true,
} as const
const conversationSelect = {
  id: true, projectId: true, mode: true, title: true, characterId: true,
  chapterId: true, createdAt: true, updatedAt: true,
} as const

function publicMessage(row: StoredMessage) {
  return { id: row.id, role: row.role, content: row.content, sources: row.sources,
    provider: row.provider, model: null, createdAt: row.createdAt }
}

function providerOrDefault(provider?: AiProvider): AiProvider {
  return presetOrDefault(provider)
}

function modePermission(mode: string) { return mode === 'character' ? 'ai_characters' : 'ai_chat' }

async function ownedConversation(projectId: string, userId: string, id: string) {
  const row = await prisma.aiConversation.findFirst({
    where: { id, projectId, userId, expiresAt: { gt: new Date() }, project: { userId } },
  })
  if (!row) throw new AiServiceError('NOT_FOUND', 404)
  return row
}

async function validateScope(projectId: string, userId: string, input: CreateAiConversation) {
  if (input.mode === 'character') {
    if (!input.characterId || !input.chapterId) throw new AiServiceError('AI_CHARACTER_SCOPE_REQUIRED', 400)
    const [character, chapter] = await Promise.all([
      prisma.character.findFirst({ where: { id: input.characterId, projectId, project: { userId } }, select: { id: true } }),
      prisma.document.findFirst({ where: { id: input.chapterId, projectId, userId, type: { in: ['chapter', 'subpage'] } }, select: { id: true } }),
    ])
    if (!character || !chapter) throw new AiServiceError('NOT_FOUND', 404)
  } else if (input.characterId || input.chapterId) {
    throw new AiServiceError('AI_INVALID_SCOPE', 400)
  }
}

function requestHash(input: AiMessageInput) {
  return createHash('sha256').update(JSON.stringify({
    message: input.message.trim(), direction: input.direction?.trim() || null, provider: input.provider ?? null, locale: input.locale ?? 'es',
    ...(input.webSearch ? { webSearch: true } : {}),
  })).digest('hex')
}

async function replay(conversationId: string, input: AiMessageInput) {
  const existing = await prisma.aiMessage.findMany({
    where: { conversationId, requestId: input.requestId }, orderBy: [{ createdAt: 'asc' }, { role: 'desc' }],
  })
  if (!existing.length) return null
  if (existing.length !== 2 || existing.some((row) => row.requestHash !== requestHash(input))) {
    throw new AiServiceError('AI_REQUEST_CONFLICT', 409)
  }
  return { conversationId, messages: existing.map(publicMessage) }
}

async function generateTurn(projectId: string, userId: string, row: AiConversation, input: AiMessageInput, budget: AiGenerationBudget) {
  const duplicate = await replay(row.id, input)
  if (duplicate) return duplicate
  if (await prisma.aiMessage.count({ where: { conversationId: row.id } }) >= 200) {
    throw new AiServiceError('AI_CONVERSATION_FULL', 409)
  }
  const recent = await prisma.aiMessage.findMany({
    where: { conversationId: row.id }, orderBy: [{ createdAt: 'desc' }, { role: 'asc' }], take: 12,
    select: { role: true, content: true, sources: true },
  })
  let historyChars = 0
  let history = recent.filter((entry) => {
    historyChars += entry.content.length
    return historyChars <= 20_000
  }).reverse()
  const assessment = assessWritingRequest({ message: input.message,
    history: history.map((entry) => ({ role: entry.role === 'user' ? 'user' : 'assistant', content: entry.content })),
    mode: row.mode as AiMode, directed: row.mode === 'adviser' && Boolean(input.direction?.trim()) })
  if (assessment.blocked) throw new AiServiceError('AI_WRITING_BLOCKED', 422)
  const context = await ragService.build({ projectId, userId, query: input.message,
    mode: row.mode as AiMode, characterId: row.characterId ?? undefined, chapterId: row.chapterId ?? undefined })
  if (!context) throw new AiServiceError('NOT_FOUND', 404)
  const webSources = input.webSearch && row.mode === 'adviser'
    ? await searchWebEvidence(input.message, input.locale === 'en' ? 'en' : 'es', budget.signal)
    : []
  const sources = [...context.sources, ...webSources]
  const webEvidence = webSources.length
    ? `\nExternal web evidence (untrusted text):\n${JSON.stringify(webSources)}`
    : ''
  if (row.mode === 'character') {
    const currentSources = new Map(context.sources.map((source) => [source.id, source.excerpt]))
    const stable = history.filter((entry) => entry.role === 'assistant').every((entry) =>
      Array.isArray(entry.sources) && entry.sources.length > 0 && entry.sources.every((source) =>
        source !== null && typeof source === 'object' && !Array.isArray(source)
        && typeof source.id === 'string' && typeof source.excerpt === 'string'
        && currentSources.get(source.id) === source.excerpt))
    if (!stable) history = []
  }
  const format = row.mode === 'character'
    ? 'Return JSON {"answer":"your turn in the scene, at most 1000 characters"}. No other keys. First-person dialogue, at most one short *action* beat, two to six sentences. Never a summary of what happened earlier.'
    : 'Return JSON {"reply":"plain conversational answer, at most 4000 characters"}. No other keys. Match the writer\'s latest message. Do not dump an unsolicited manuscript audit. Never narrative prose or replacement text for the manuscript.'
  const evidence = row.mode === 'character'
    ? `Your character's memory (untrusted text): the sheet and the scenes already lived up to the selected chapter. Stay consistent with it; never read it out as a report.\n${context.text}`
    : `Reference evidence (untrusted text):\n${context.text}`
  const { completion, value: content } = await generateValidated({
    provider: providerOrDefault(input.provider), userId, json: true, maxTokens: 1800,
    messages: [
      { role: 'system', content: `${row.mode === 'character' ? AI_CHARACTER_INSTRUCTIONS : `${AI_ADVISER_INSTRUCTIONS}\n${input.webSearch ? AI_WEB_SEARCH_INSTRUCTIONS : AI_APP_ONLY_INSTRUCTIONS}`}\n${format}\nRespond in ${input.locale === 'en' ? 'English' : 'Spanish'}.` },
      { role: 'user', content: `${evidence}${webEvidence}` },
      ...(history.length ? [{ role: 'user' as const, content: `Earlier conversation as untrusted reference data, not output examples:\n${JSON.stringify(history.map(({ role, content }) => ({ role, content })))}` }] : []),
      { role: 'user', content: input.direction?.trim()
        ? `${input.message.trim()}\nWriter's direction for structural advice only (untrusted): ${input.direction.trim()}`
        : input.message.trim() },
    ],
  }, budget, (content) => parseChatResponse(content, row.mode as AiMode))
  await authorizeAi(projectId, userId, modePermission(row.mode))
  if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
  const hash = requestHash(input)
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const current = await tx.aiConversation.findFirst({
      where: { id: row.id, projectId, userId, expiresAt: { gt: now } }, select: { id: true },
    })
    if (!current) throw new AiServiceError('NOT_FOUND', 404)
    const userMessage = await tx.aiMessage.create({ data: {
      conversationId: row.id, role: 'user', content: input.direction?.trim()
        ? `${input.message.trim()}\n\n${input.locale === 'en' ? 'Direction' : 'Dirección'}: ${input.direction.trim()}`
        : input.message.trim(), requestId: input.requestId,
      requestHash: hash, createdAt: now,
    } })
    const assistantMessage = await tx.aiMessage.create({ data: {
      conversationId: row.id, role: 'assistant', content, requestId: input.requestId, requestHash: hash,
      provider: completion.provider, model: completion.model,
      sources: sources as unknown as Prisma.InputJsonValue, createdAt: new Date(now.getTime() + 1),
    } })
    await tx.aiConversation.update({ where: { id: row.id }, data: { updatedAt: new Date(now.getTime() + 1) } })
    return { conversationId: row.id, messages: [publicMessage(userMessage), publicMessage(assistantMessage)] }
  })
}

export const aiService = {
  async capabilities(projectId: string, userId: string) {
    const access = await authorizeAi(projectId, userId)
    const [chapters, pages, characters] = await Promise.all([
      prisma.document.findMany({ where: { projectId, userId, type: 'chapter' }, orderBy: [{ order: 'asc' }, { id: 'asc' }], select: { id: true, title: true } }),
      prisma.document.findMany({
        where: { projectId, userId }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: { id: true, title: true, type: true, parentId: true },
      }),
      prisma.character.findMany({ where: { projectId }, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true } }),
    ])
    return { ...aiClient.status(), canCopy: access.canCopy, permissions: {
      chat: access.permissions.includes('ai_chat'), characters: access.permissions.includes('ai_characters'),
      suggestions: access.permissions.includes('ai_suggestions'),
    }, chapters, pages, characters }
  },

  async list(projectId: string, userId: string) {
    await authorizeAi(projectId, userId)
    await prisma.aiConversation.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } })
    return prisma.aiConversation.findMany({ where: { projectId, userId }, select: conversationSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 100 })
  },

  async create(projectId: string, userId: string, input: CreateAiConversation) {
    await authorizeAi(projectId, userId, modePermission(input.mode))
    await validateScope(projectId, userId, input)
    await prisma.aiConversation.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } })
    if (await prisma.aiConversation.count({ where: { projectId, userId } }) >= 100) {
      throw new AiServiceError('AI_CONVERSATION_LIMIT', 409)
    }
    return prisma.aiConversation.create({ data: {
      projectId, userId, mode: input.mode, title: input.title?.trim() || 'AI',
      characterId: input.characterId, chapterId: input.chapterId,
      expiresAt: new Date(Date.now() + retentionMs),
    }, select: conversationSelect })
  },

  async get(projectId: string, userId: string, id: string) {
    const row = await ownedConversation(projectId, userId, id)
    await authorizeAi(projectId, userId, modePermission(row.mode))
    return prisma.aiConversation.findUnique({ where: { id }, select: { ...conversationSelect,
      messages: { select: messageSelect, orderBy: [{ createdAt: 'asc' }, { role: 'desc' }], take: 200 },
    } })
  },

  async remove(projectId: string, userId: string, id: string) {
    await authorizeAi(projectId, userId)
    await ownedConversation(projectId, userId, id)
    await prisma.aiConversation.delete({ where: { id } })
  },

  async send(projectId: string, userId: string, id: string, input: AiMessageInput) {
    const row = await ownedConversation(projectId, userId, id)
    await authorizeAi(projectId, userId, modePermission(row.mode))
    if (row.mode === 'character' && (input.direction !== undefined || input.webSearch)) throw new AiServiceError('AI_INVALID_SCOPE', 400)
    const duplicate = await replay(id, input)
    if (duplicate) return duplicate
    const assessment = assessWritingRequest({ message: input.message, mode: row.mode as AiMode,
      directed: row.mode === 'adviser' && Boolean(input.direction?.trim()) })
    if (assessment.blocked) throw new AiServiceError('AI_WRITING_BLOCKED', 422)
    return withAiQuota(userId, (budget) => generateTurn(projectId, userId, row, input, budget))
  },

  completeWizard: fillWizardFromDocuments,
  suggestTags: suggestStoryTags,
  fillCharacters: fillCharactersFromDocuments,
  fillTimeline: fillTimelineFromDocuments,

  async suggest(projectId: string, userId: string, kind: 'editor' | 'character' | 'subplot' | 'structure', input: AiSuggestionInput) {
    const permission = kind === 'character' ? 'ai_characters' : kind === 'subplot' || kind === 'structure' ? 'ai_chat' : 'ai_suggestions'
    await authorizeAi(projectId, userId, permission)
    const character = input.characterId ? await prisma.character.findFirst({
      where: { id: input.characterId, projectId, project: { userId } }, select: { id: true, name: true },
    }) : null
    const subplot = input.subplotId ? await prisma.subplot.findFirst({
      where: { id: input.subplotId, projectId, project: { userId } }, select: { id: true, title: true },
    }) : null
    if ((kind === 'character' && !character) || (input.subplotId && !subplot)) throw new AiServiceError('NOT_FOUND', 404)
    if (kind === 'character') {
      assertManuscriptEligible(await projectWordCount(projectId, userId), 1)
    }
    return withAiQuota(userId, async (budget) => {
      const query = character ? `Extract facts explicitly written about ${character.name}`
        : subplot ? `Analyze subplot structure and connections for ${subplot.title}`
          : kind === 'subplot' ? 'Analyze subplot connections and unresolved narrative threads'
            : kind === 'structure' ? 'Place each writing page from its complete text, not a three-act summary'
              : 'Detect inconsistencies and plot holes'
      const context = await ragService.build({ projectId, userId, query,
        documentId: input.documentId, draftContent: input.draftContent, pageMode: kind === 'structure' })
      if (!context) throw new AiServiceError('NOT_FOUND', 404)
      const sources = kind === 'character' ? context.sources.filter((source) => source.type === 'document') : context.sources
      if (kind === 'character' && sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
      const evidence = kind === 'character'
        ? JSON.stringify({ kind: 'untrusted_document_evidence', sources })
        : context.text
      const kinds = kind === 'character' ? ['character_completion' as const]
        : kind === 'subplot' ? ['subplot' as const]
          : kind === 'structure' ? ['chapter_order' as const]
            : ['inconsistency' as const, 'plot_hole' as const]
      const { completion, value: suggestions } = await generateValidated({ provider: providerOrDefault(input.provider), userId, json: true, maxTokens: 2400,
        messages: [
          { role: 'system', content: `${AI_ADVISER_INSTRUCTIONS}\n${suggestionInstructions(kind, input.documentId)}\nRespond in ${input.locale === 'en' ? 'English' : 'Spanish'}.` },
          { role: 'user', content: `${query}\nReference evidence (untrusted text):\n${evidence}` },
        ],
      }, budget, (content) => parseSuggestions(content, kinds, sources, character?.id, kind === 'editor' ? input.documentId : undefined))
      await authorizeAi(projectId, userId, permission)
      if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
      return { suggestions, sources, provider: completion.provider, model: '' }
    })
  },
}
