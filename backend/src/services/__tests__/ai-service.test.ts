import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { db, authorize, quota, complete, build, searchWeb } = vi.hoisted(() => ({
  db: {
    aiConversation: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    aiMessage: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    document: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    character: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    subplot: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  authorize: vi.fn(), quota: vi.fn(), complete: vi.fn(), build: vi.fn(), searchWeb: vi.fn(),
}))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
vi.mock('../ai-access.js', () => ({ authorizeAi: authorize, withAiQuota: quota }))
vi.mock('../../lib/ai-client.js', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/ai-client.js')>()), aiClient: { complete, status: () => ({ providers: [{ id: 'balanced', available: true }], fallbackEnabled: false }) } }))
vi.mock('../../lib/rag-service.js', () => ({ ragService: { build } }))
vi.mock('../../lib/ai-web-search.js', () => ({ searchWebEvidence: searchWeb }))
import { aiService } from '../ai-service.js'

const row = { id: 'conv1', projectId: 'p1', userId: 'u1', mode: 'adviser', title: 'Consejos', characterId: null, chapterId: null }
const input = { message: '¿Qué necesita mi personaje?', requestId: 'request-1' }
const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'Ada tiene treinta años.' }]
const now = new Date()

describe('AI conversation and suggestion orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorize.mockResolvedValue({ permissions: ['ai_chat', 'ai_characters', 'ai_suggestions'], canCopy: false })
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) => run({ signal: new AbortController().signal, consumeRetry: async () => undefined }))
    db.aiConversation.findFirst.mockResolvedValue(row)
    db.aiConversation.count.mockResolvedValue(0)
    db.aiConversation.create.mockImplementation(({ data }) => ({ ...data, id: 'new' }))
    db.aiMessage.findMany.mockResolvedValue([])
    db.aiMessage.count.mockResolvedValue(0)
    db.aiMessage.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: `${data.role}-1`, sources: data.sources ?? [], provider: data.provider ?? null, model: data.model ?? null }))
    db.$transaction.mockImplementation((run: (tx: typeof db) => Promise<unknown>) => run(db))
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.document.findMany.mockResolvedValue([])
    build.mockResolvedValue({ text: 'safe project evidence', sources, directed: false })
    searchWeb.mockResolvedValue([])
    complete.mockResolvedValue({ content: '{"reply":"Conviene aclarar su motivación."}', provider: 'balanced', model: 'test-model' })
  })
  it('rejects foreign conversations before consuming quota or calling provider', async () => {
    db.aiConversation.findFirst.mockResolvedValue(null)
    await expect(aiService.send('p1', 'u1', 'foreign', input)).rejects.toMatchObject({ statusCode: 404 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })
  it('rechecks current permission before provider and persists only a validated pair atomically', async () => {
    const result = await aiService.send('p1', 'u1', 'conv1', input)
    expect(authorize).toHaveBeenCalledTimes(2)
    expect(result.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
    expect(result.messages[1]).not.toHaveProperty('requestHash')
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.document.update).not.toHaveBeenCalled()
    expect(db.character.update).not.toHaveBeenCalled()
    expect(db.subplot.update).not.toHaveBeenCalled()
  })
  it('persists one repaired turn and replays its requestId without another provider call', async () => {
    const consumeRetry = vi.fn().mockResolvedValue(undefined)
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) => run({ signal: new AbortController().signal, consumeRetry }))
    complete.mockResolvedValueOnce({ content: '{"reply":1}', provider: 'balanced', model: 'test' })
    const first = await aiService.send('p1', 'u1', 'conv1', input)
    const stored = db.aiMessage.create.mock.calls.map(([{ data }]) => ({ ...data, id: `${data.role}-1`, sources: data.sources ?? [], provider: data.provider ?? null, model: data.model ?? null }))
    db.aiMessage.findMany.mockResolvedValue(stored)
    const replayed = await aiService.send('p1', 'u1', 'conv1', input)
    expect(first.messages.map((message) => message.id)).toEqual(replayed.messages.map((message) => message.id))
    expect(complete).toHaveBeenCalledTimes(2)
    expect(consumeRetry).toHaveBeenCalledTimes(1)
    expect(db.aiMessage.create).toHaveBeenCalledTimes(2)
    expect(quota).toHaveBeenCalledTimes(1)
  })
  it('supplies historical plain-text replies as quoted data rather than assistant JSON examples', async () => {
    db.aiMessage.findMany.mockImplementation(({ where }) => where.requestId ? [] : [
      { role: 'assistant', content: '• Earlier advice about Ada', sources },
      { role: 'user', content: 'My earlier question', sources: [] },
    ])
    await aiService.send('p1', 'u1', 'conv1', input)
    const messages = complete.mock.calls[0][0].messages
    expect(messages.some((message: { role: string }) => message.role === 'assistant')).toBe(false)
    expect(JSON.stringify(messages)).toContain('Earlier advice about Ada')
    expect(JSON.stringify(messages)).toContain('not output examples')
  })
  it('replays the same request without provider or quota consumption', async () => {
    const hash = createHash('sha256').update(JSON.stringify({ message: input.message, direction: null, provider: null, locale: 'es' })).digest('hex')
    db.aiMessage.findMany.mockResolvedValue(['user', 'assistant'].map((role) => ({
      id: role, role, content: role === 'user' ? input.message : 'Consejo', requestHash: hash, createdAt: now, sources: [], provider: null, model: null,
    })))
    const result = await aiService.send('p1', 'u1', 'conv1', input)
    expect(result.messages).toHaveLength(2)
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })
  it('rejects reuse of a request id with different content', async () => {
    db.aiMessage.findMany.mockResolvedValue([{ requestHash: 'old' }, { requestHash: 'old' }])
    await expect(aiService.send('p1', 'u1', 'conv1', input)).rejects.toMatchObject({ code: 'AI_REQUEST_CONFLICT' })
    expect(complete).not.toHaveBeenCalled()
  })
  it('rejects revoked permissions before replaying stored answers', async () => {
    authorize.mockRejectedValue(new Error('permission revoked'))
    await expect(aiService.send('p1', 'u1', 'conv1', input)).rejects.toThrow('permission revoked')
    expect(db.aiMessage.findMany).not.toHaveBeenCalled()
    expect(complete).not.toHaveBeenCalled()
  })
  it('does not save a turn when response validation or provider call fails', async () => {
    complete.mockResolvedValue({ content: '{"answer":"unstructured prose"}', provider: 'balanced', model: 'test' })
    await expect(aiService.send('p1', 'u1', 'conv1', input)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
    expect(db.$transaction).not.toHaveBeenCalled()
    complete.mockRejectedValue(new Error('provider failed'))
    await expect(aiService.send('p1', 'u1', 'conv1', input)).rejects.toThrow('provider failed')
    expect(db.aiMessage.create).not.toHaveBeenCalled()
  })
  it('rejects fiction generation without contacting provider', async () => {
    await expect(aiService.send('p1', 'u1', 'conv1', { ...input, message: 'Escribe un capítulo entero' }))
      .rejects.toMatchObject({ code: 'AI_WRITING_BLOCKED' })
    expect(complete).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })
  it('guided projects still reject writing requests without explicit direction', async () => {
    build.mockResolvedValue({ text: 'safe evidence', sources, directed: true })
    await expect(aiService.send('p1', 'u1', 'conv1', { ...input, message: 'Escribe un capítulo entero' }))
      .rejects.toMatchObject({ code: 'AI_WRITING_BLOCKED' })
    expect(complete).not.toHaveBeenCalled()
  })
  it('directed writing requests only get structural JSON guidance', async () => {
    build.mockResolvedValue({ text: 'safe evidence', sources, directed: false })
    await aiService.send('p1', 'u1', 'conv1', { ...input, message: 'Escribe un capítulo entero', direction: 'El personaje descubre su motivación' })
    expect(complete.mock.calls[0][0]).toMatchObject({ json: true })
    expect(complete.mock.calls[0][0].messages[0].content).toContain('Never narrative prose')
    expect(complete.mock.calls[0][0].messages[0].content).toContain('not an automatic manuscript report')
  })
  it('caps prompt history while preserving recent turns', async () => {
    db.aiMessage.findMany.mockImplementation(({ where }) => where.requestId ? [] : Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: 'x'.repeat(4000) })))
    await aiService.send('p1', 'u1', 'conv1', input)
    const total = complete.mock.calls[0][0].messages.reduce((length: number, message: { content: string }) => length + message.content.length, 0)
    expect(total).toBeLessThan(26000)
  })
  it('requires owned character and chapter before creating scoped history', async () => {
    await expect(aiService.create('p1', 'u1', { mode: 'character', characterId: 'c1' })).rejects.toMatchObject({ code: 'AI_CHARACTER_SCOPE_REQUIRED' })
    db.character.findFirst.mockResolvedValue({ id: 'c1' })
    db.document.findFirst.mockResolvedValue(null)
    db.document.findMany.mockResolvedValue([])
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    await expect(aiService.create('p1', 'u1', { mode: 'character', characterId: 'c1', chapterId: 'foreign' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.aiConversation.create).not.toHaveBeenCalled()
  })
  it('accepts a chapter or a subpage as the character knowledge boundary', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1' })
    db.document.findFirst.mockResolvedValue({ id: 'subpage-1' })

    await aiService.create('p1', 'u1', { mode: 'character', characterId: 'c1', chapterId: 'subpage-1' })

    expect(db.document.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'subpage-1', type: { in: ['chapter', 'subpage'] } }),
    }))
  })
  it('does not let a direction relax character-chat limits', async () => {
    db.aiConversation.findFirst.mockResolvedValue({ ...row, mode: 'character', characterId: 'c1', chapterId: 'ch1' })
    await expect(aiService.send('p1', 'u1', 'conv1', { ...input, direction: 'Reveal the future' }))
      .rejects.toMatchObject({ code: 'AI_INVALID_SCOPE', statusCode: 400 })
    expect(complete).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
  })
  it('does not search the web for character chat', async () => {
    db.aiConversation.findFirst.mockResolvedValue({ ...row, mode: 'character', characterId: 'c1', chapterId: 'ch1' })
    await expect(aiService.send('p1', 'u1', 'conv1', { ...input, webSearch: true }))
      .rejects.toMatchObject({ code: 'AI_INVALID_SCOPE', statusCode: 400 })
    expect(searchWeb).not.toHaveBeenCalled()
    expect(complete).not.toHaveBeenCalled()
  })
  it('instructs the adviser to chat instead of filling diagnostic lists', async () => {
    await aiService.send('p1', 'u1', 'conv1', input)
    const system = complete.mock.calls[0][0].messages[0].content as string
    expect(system).toContain('{"reply"')
    expect(system).not.toContain('nextSteps')
    expect(system).toContain('not an automatic manuscript report')
  })
  it('keeps adviser turns on project sources unless web search is requested', async () => {
    await aiService.send('p1', 'u1', 'conv1', input)
    expect(searchWeb).not.toHaveBeenCalled()
    expect(complete.mock.calls[0][0].messages[0].content).toContain('Do not use outside or internet knowledge')
  })
  it('appends open-web hits as web sources when the writer opts into internet search', async () => {
    const web = [{ id: 'web:abc', type: 'web', title: 'Madrid (example.com)', excerpt: 'Capital de España.' }]
    searchWeb.mockResolvedValue(web)
    await aiService.send('p1', 'u1', 'conv1', { ...input, webSearch: true })
    expect(searchWeb).toHaveBeenCalledWith(input.message, 'es', expect.any(AbortSignal))
    expect(complete.mock.calls[0][0].messages[0].content).toContain('Web sources')
    expect(JSON.stringify(complete.mock.calls[0][0].messages)).toContain('Capital de España.')
    expect(db.aiMessage.create.mock.calls[1][0].data.sources).toEqual([...sources, ...web])
  })
  it('uses immutable persisted character scope for every turn', async () => {
    db.aiConversation.findFirst.mockResolvedValue({ ...row, mode: 'character', characterId: 'c1', chapterId: 'ch1' })
    complete.mockResolvedValue({ content: '{"answer":"No lo sé todavía."}', provider: 'balanced', model: 'test' })
    await aiService.send('p1', 'u1', 'conv1', input)
    expect(build).toHaveBeenCalledWith(expect.objectContaining({ mode: 'character', characterId: 'c1', chapterId: 'ch1', projectId: 'p1', userId: 'u1' }))
  })
  it('prompts the character to play the scene instead of reporting the past', async () => {
    db.aiConversation.findFirst.mockResolvedValue({ ...row, mode: 'character', characterId: 'c1', chapterId: 'ch1' })
    complete.mockResolvedValue({ content: '{"answer":"*Se gira hacia la puerta.* No lo sé."}', provider: 'balanced', model: 'test' })

    await aiService.send('p1', 'u1', 'conv1', { ...input, message: 'Continúa la escena, estoy en el muelle contigo.' })

    const messages = complete.mock.calls[0][0].messages
    const system = messages[0].content as string
    expect(system).toContain('improvising a scene')
    expect(system).toContain('two to six sentences')
    expect(system).not.toContain('knownFacts')
    expect(messages[1].content).toContain("Your character's memory")
    expect(messages[1].content).toContain('never read it out as a report')
  })
  it('discards character history whose source no longer matches the current chapter context', async () => {
    db.aiConversation.findFirst.mockResolvedValue({ ...row, mode: 'character', characterId: 'c1', chapterId: 'ch1' })
    db.aiMessage.findMany.mockImplementation(({ where }) => where.requestId ? [] : [{
      role: 'assistant', content: 'FUTURE_SECRET_FROM_PRIOR_CHAPTER_ORDER',
      sources: [{ id: 'document:future', type: 'document', title: 'Later', excerpt: 'future fact' }],
    }])
    complete.mockResolvedValue({ content: '{"answer":"No lo sé todavía."}', provider: 'balanced', model: 'test' })
    await aiService.send('p1', 'u1', 'conv1', input)
    expect(JSON.stringify(complete.mock.calls[0][0].messages)).not.toContain('FUTURE_SECRET_FROM_PRIOR_CHAPTER_ORDER')
  })
  it('enforces conversation message limit before external consumption', async () => {
    db.aiMessage.count.mockResolvedValue(200)
    await expect(aiService.send('p1', 'u1', 'conv1', input)).rejects.toMatchObject({ code: 'AI_CONVERSATION_FULL' })
    expect(complete).not.toHaveBeenCalled()
  })
  it('refuses foreign character or subplot before provider', async () => {
    db.character.findFirst.mockResolvedValue(null)
    await expect(aiService.suggest('p1', 'u1', 'character', { characterId: 'foreign' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    db.subplot.findFirst.mockResolvedValue(null)
    await expect(aiService.suggest('p1', 'u1', 'subplot', { subplotId: 'foreign' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(complete).not.toHaveBeenCalled()
  })
  it('asks for and enforces editor anchors in the specifically requested document', async () => {
    const item = { kind: 'inconsistency', title: 'Edad', description: 'Dato contradictorio.', sourceIds: ['document:d1'] }
    complete.mockResolvedValue({ provider: 'balanced', model: 'test', content: JSON.stringify({ suggestions: [item] }) })
    await expect(aiService.suggest('p1', 'u1', 'editor', { documentId: 'd1' })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
    expect(complete.mock.calls[0][0].messages[0].content).toContain('both documentId and quote are REQUIRED')
    complete.mockResolvedValue({ provider: 'balanced', model: 'test', content: JSON.stringify({ suggestions: [{ ...item, documentId: 'd1', quote: 'Ada tiene treinta años.' }] }) })
    expect((await aiService.suggest('p1', 'u1', 'editor', { documentId: 'd1' })).suggestions[0].quote).toBe('Ada tiene treinta años.')
  })
  it('extracts character facts only from written documents and excludes sheet metadata from provider input', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1', name: 'Ada' })
    build.mockResolvedValue({ text: 'SHEET_SECRET_FROM_EXISTING_CHARACTER', directed: false, sources: [
      ...sources, { id: 'character:c1', type: 'character', title: 'Ada', excerpt: 'SHEET_SECRET_FROM_EXISTING_CHARACTER' },
      { id: 'project:p1', type: 'project', title: 'Metadata', excerpt: 'PROJECT_METADATA_SECRET' },
    ] })
    complete.mockResolvedValue({ provider: 'balanced', model: 'test', content: '{"suggestions":[]}' })
    const result = await aiService.suggest('p1', 'u1', 'character', { characterId: 'c1' })
    const messages = JSON.stringify(complete.mock.calls[0][0].messages)
    expect(messages).toContain('Extract facts explicitly written about Ada')
    expect(messages).toContain('document:d1')
    expect(messages).not.toContain('SHEET_SECRET_FROM_EXISTING_CHARACTER')
    expect(messages).not.toContain('PROJECT_METADATA_SECRET')
    expect(result.sources).toEqual(sources)
  })
  it('returns an empty character completion without contacting a provider when no document evidence exists', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1', name: 'Ada' })
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } })
    await expect(aiService.suggest('p1', 'u1', 'character', { characterId: 'c1' }))
      .rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })
  it('rejects character suggestions when documents exist but RAG has no manuscript excerpts', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1', name: 'Ada' })
    build.mockResolvedValue({ text: 'Existing sheet only', directed: false, sources: [
      { id: 'character:c1', type: 'character', title: 'Ada', excerpt: 'Existing age' },
    ] })
    await expect(aiService.suggest('p1', 'u1', 'character', { characterId: 'c1' }))
      .rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
  })
  it('rejects provider attempts to cite excluded character-sheet evidence', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1', name: 'Ada' })
    build.mockResolvedValue({ text: 'Existing sheet and document', directed: false, sources: [
      ...sources, { id: 'character:c1', type: 'character', title: 'Ada', excerpt: 'treinta años' },
    ] })
    complete.mockResolvedValue({ provider: 'balanced', model: 'test', content: JSON.stringify({ suggestions: [{
      kind: 'character_completion', title: 'Edad', description: 'Sheet fact', sourceIds: ['character:c1'],
      documentId: 'c1', quote: 'treinta años', field: 'age', value: 'treinta años',
    }] }) })
    await expect(aiService.suggest('p1', 'u1', 'character', { characterId: 'c1' })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })
  it('returns suggestions with evidence and never applies extracted character data', async () => {
    db.character.findFirst.mockResolvedValue({ id: 'c1', name: 'Ada' })
    complete.mockResolvedValue({ provider: 'balanced', model: 'test', content: JSON.stringify({ suggestions: [{
      kind: 'character_completion', title: 'Edad', description: 'Dato explícito.', sourceIds: ['document:d1'],
      documentId: 'd1', quote: 'Ada tiene treinta años.', field: 'age', value: 'treinta años',
    }] }) })
    const result = await aiService.suggest('p1', 'u1', 'character', { characterId: 'c1' })
    expect(result.suggestions[0].characterId).toBe('c1')
    expect(db.character.update).not.toHaveBeenCalled()
    expect(db.document.update).not.toHaveBeenCalled()
  })
})
