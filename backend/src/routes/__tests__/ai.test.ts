import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
const { getSessionUser, service } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  service: { capabilities: vi.fn(), list: vi.fn(), create: vi.fn(), get: vi.fn(), remove: vi.fn(), send: vi.fn(), suggest: vi.fn(), completeWizard: vi.fn(), suggestTags: vi.fn(), fillCharacters: vi.fn(), fillTimeline: vi.fn() },
}))
vi.mock('../../lib/session.js', () => ({ getSessionUser }))
vi.mock('../../services/ai-service.js', () => ({ aiService: service }))
vi.mock('../../lib/prisma.js', () => ({ prisma: {} }))
import { aiRoutes } from '../ai.js'
import { AiClientError } from '../../lib/ai-client.js'
import { RagContextError } from '../../lib/rag-service.js'
import { AiServiceError } from '../../services/ai-types.js'

const now = new Date().toISOString()
const conversation = { id: 'c1', projectId: 'p1', mode: 'adviser', title: 'Consejos', characterId: null, chapterId: null, createdAt: now, updatedAt: now }
const source = { id: 'document:d1', type: 'document', title: 'Capítulo 1', excerpt: 'Ada descubre la puerta.' }
const assistant = { id: 'm1', role: 'assistant', content: '¿Qué desea Ada?', sources: [source], provider: 'balanced', model: 'test-model', createdAt: now }
let app: FastifyInstance
const base = '/api/projects/p1/ai'

beforeEach(async () => {
  vi.clearAllMocks()
  getSessionUser.mockResolvedValue({ id: 'u1', role: 'stale-user' })
  app = Fastify({ logger: false })
  await app.register(aiRoutes, { prefix: '/api' })
  await app.ready()
})
afterEach(async () => { await app.close() })

describe('AI route authorization and JSON contracts', () => {
  it.each([
    ['GET', '/capabilities'], ['GET', '/conversations'], ['GET', '/conversations/c1'],
    ['DELETE', '/conversations/c1'], ['POST', '/suggestions'], ['POST', '/subplot-suggestions'],
  ] as const)('requires a session for %s %s', async (method, path) => {
    getSessionUser.mockResolvedValue(null)
    const response = await app.inject({ method, url: `${base}${path}`, ...(method === 'POST' ? { payload: {} } : {}) })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'UNAUTHORIZED' })
  })
  it('only returns safe capability fields, with role resolved by service', async () => {
    service.capabilities.mockResolvedValue({ providers: [{ id: 'balanced', available: true, trainsData: true, comingSoon: false, key: 'must-not-leak' }], fallbackEnabled: false,
      canCopy: false, permissions: { chat: true, characters: false, suggestions: false }, chapters: [], pages: [], characters: [], private: 'secret' })
    const response = await app.inject({ method: 'GET', url: `${base}/capabilities` })
    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain('must-not-leak')
    expect(response.body).not.toContain('secret')
    expect(service.capabilities).toHaveBeenCalledWith('p1', 'u1')
  })
  it('creates conversation with validated immutable scope', async () => {
    service.create.mockResolvedValue({ ...conversation, mode: 'character', characterId: 'person', chapterId: 'chapter' })
    const response = await app.inject({ method: 'POST', url: `${base}/conversations`, payload: {
      mode: 'character', characterId: 'person', chapterId: 'chapter', userId: 'someone-else', expiresAt: '2999-01-01',
    } })
    expect(response.statusCode).toBe(201)
    expect(service.create).toHaveBeenCalledWith('p1', 'u1', { mode: 'character', characterId: 'person', chapterId: 'chapter' })
  })
  it('returns conversation history without request hashes or user ids', async () => {
    service.get.mockResolvedValue({ ...conversation, userId: 'private', messages: [{ ...assistant, requestHash: 'sensitive', requestId: 'private' }] })
    const response = await app.inject({ method: 'GET', url: `${base}/conversations/c1` })
    expect(response.statusCode).toBe(200)
    expect(response.json().messages[0]).toEqual(assistant)
    expect(response.body).not.toContain('sensitive')
    expect(response.body).not.toContain('private')
  })
  it.each([
    { message: 'x', requestId: 'short' },
    { message: ' ', requestId: 'request-1' },
    { message: 'x'.repeat(4001), requestId: 'request-1' },
    { message: 'x', requestId: 'request-1', provider: 'https://evil.invalid' },
    { message: 'x', requestId: 'request-1', direction: 'd'.repeat(2001) },
    { message: 'x', requestId: 'request-1', locale: 'xx' },
  ])('rejects malformed message input before provider service', async (payload) => {
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'AI_INVALID_INPUT' })
    expect(service.send).not.toHaveBeenCalled()
  })
  it('strips scope changes and client-injected history from message requests', async () => {
    service.send.mockResolvedValue({ conversationId: 'c1', messages: [assistant] })
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload: {
      message: '¿Qué desea?', requestId: 'request-1', direction: 'Explorar su miedo', chapterId: 'future', characterId: 'other', history: ['future secrets'],
    } })
    expect(response.statusCode).toBe(200)
    expect(service.send).toHaveBeenCalledWith('p1', 'u1', 'c1', { message: '¿Qué desea?', requestId: 'request-1', direction: 'Explorar su miedo' })
  })
  it('forwards webSearch and still strips injected history', async () => {
    service.send.mockResolvedValue({ conversationId: 'c1', messages: [assistant] })
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload: {
      message: '¿Qué clima tiene Madrid?', requestId: 'request-2', webSearch: true, history: ['future secrets'],
    } })
    expect(response.statusCode).toBe(200)
    expect(service.send).toHaveBeenCalledWith('p1', 'u1', 'c1', { message: '¿Qué clima tiene Madrid?', requestId: 'request-2', webSearch: true })
  })
  it('accepts every documented suggestion kind without auto-applying fields', async () => {
    service.suggest.mockResolvedValue({ suggestions: [], sources: [source], provider: 'balanced', model: 'test' })
    for (const [path, body] of [['suggestions', { documentId: 'd1', draftContent: 'Draft' }],
      ['character-suggestions', { characterId: 'p1' }], ['subplot-suggestions', { subplotId: 's1' }]] as const) {
      const response = await app.inject({ method: 'POST', url: `${base}/${path}`, payload: body })
      expect(response.statusCode).toBe(200)
      expect(response.json().sources).toEqual([source])
    }
  })
  it('limits the editor draft size and requires character id', async () => {
    const draft = await app.inject({ method: 'POST', url: `${base}/suggestions`, payload: { documentId: 'd1', draftContent: 'x'.repeat(56001) } })
    const character = await app.inject({ method: 'POST', url: `${base}/character-suggestions`, payload: {} })
    expect(draft.statusCode).toBe(400)
    expect(character.statusCode).toBe(400)
    expect(service.suggest).not.toHaveBeenCalled()
  })
  it.each([
    new AiServiceError('AI_PERMISSION_REQUIRED', 403), new AiServiceError('AI_REQUEST_CONFLICT', 409),
    new AiClientError('AI_AUTHENTICATION_FAILED', 503), new AiClientError('AI_TIMEOUT', 504),
    new RagContextError('AI_CONTEXT_TOO_LARGE', 413),
  ])('returns known failure codes without provider details', async (error) => {
    service.send.mockRejectedValue(error)
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload: { message: '¿Qué desea?', requestId: 'request-1' } })
    expect(response.statusCode).toBe(error.statusCode)
    expect(response.json()).toEqual({ error: error.code })
  })
  it('sanitizes unexpected provider/database errors', async () => {
    service.send.mockRejectedValue(new Error('postgres://user:password@internal-host'))
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload: { message: '¿Qué desea?', requestId: 'request-1' } })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: 'AI_REQUEST_FAILED' })
    expect(response.body).not.toContain('password')
  })
  it('logs safe Prisma and database codes without connection details', async () => {
    const log = vi.spyOn(app.log, 'error')
    service.send.mockRejectedValue(Object.assign(new Error('password@private-host'), {
      name: 'PrismaClientKnownRequestError', code: 'P2037',
      meta: { driverAdapterError: { cause: { originalCode: '53300', message: 'private connection details' } } },
    }))
    const response = await app.inject({ method: 'POST', url: `${base}/conversations/c1/messages`, payload: { message: '¿Qué desea?', requestId: 'request-1' } })
    expect(response.statusCode).toBe(500)
    expect(log).toHaveBeenCalledWith({ operation: 'ai', errorType: 'PrismaClientKnownRequestError', errorCode: 'P2037', databaseCode: '53300' }, 'AI request failed')
    expect(JSON.stringify(log.mock.calls)).not.toContain('private')
    expect(response.json()).toEqual({ error: 'AI_REQUEST_FAILED' })
  })
  it('deletes owned history with a bodyless 204 response', async () => {
    service.remove.mockResolvedValue(undefined)
    const response = await app.inject({ method: 'DELETE', url: `${base}/conversations/c1` })
    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
  })
  it('returns wizard empty and insufficient codes without calling other AI kinds', async () => {
    service.completeWizard.mockRejectedValue(new AiServiceError('AI_WIZARD_EMPTY', 422))
    const empty = await app.inject({ method: 'POST', url: `${base}/wizard-completion`, payload: { stage: 'description' } })
    expect(empty.statusCode).toBe(422)
    expect(empty.json()).toEqual({ error: 'AI_WIZARD_EMPTY' })
    service.completeWizard.mockRejectedValue(new AiServiceError('AI_WIZARD_INSUFFICIENT', 422))
    const short = await app.inject({ method: 'POST', url: `${base}/wizard-completion`, payload: { locale: 'es', stage: 'basics' } })
    expect(short.json()).toEqual({ error: 'AI_WIZARD_INSUFFICIENT' })
    expect(service.suggest).not.toHaveBeenCalled()
    expect(service.send).not.toHaveBeenCalled()
  })
  it('returns a wizard stage patch without persisting through the AI route', async () => {
    service.completeWizard.mockResolvedValue({
      description: null, meta: { type: ['Romance'] }, suggestions: [], stage: 'basics',
      sources: [source], provider: 'balanced', model: 'test',
    })
    const response = await app.inject({ method: 'POST', url: `${base}/wizard-completion`, payload: { locale: 'es', stage: 'basics' } })
    expect(response.statusCode).toBe(200)
    expect(service.completeWizard).toHaveBeenCalledWith('p1', 'u1', { locale: 'es', stage: 'basics' })
    expect(response.json().meta).toEqual({ type: ['Romance'] })
    expect(response.json().suggestions).toEqual([])
  })
  it('serializes wizard suggestion values that are arrays or strings', async () => {
    service.completeWizard.mockResolvedValue({
      description: null, meta: {}, stage: 'basics', sources: [source], provider: 'balanced', model: 'test',
      suggestions: [
        { field: 'type', title: 'Géneros', description: 'Hay romance.', value: ['Romance'] },
        { field: 'rating', title: 'Público', description: 'Texto adulto.', value: 'mature' },
      ],
    })
    const response = await app.inject({ method: 'POST', url: `${base}/wizard-completion`, payload: { locale: 'es', stage: 'basics' } })
    expect(response.statusCode).toBe(200)
    expect(response.json().suggestions[0].value).toEqual(['Romance'])
    expect(response.json().suggestions[1].value).toBe('mature')
  })
  it('returns character fills without persisting through the AI route', async () => {
    service.fillCharacters.mockResolvedValue({
      characters: [{ name: 'Ada', description: 'Vive en Madrid.' }], sources: [source], provider: 'balanced', model: 'test',
    })
    const response = await app.inject({ method: 'POST', url: `${base}/character-fill`, payload: { locale: 'es', name: 'Ada' } })
    expect(response.statusCode).toBe(200)
    expect(service.fillCharacters).toHaveBeenCalledWith('p1', 'u1', { locale: 'es', name: 'Ada' })
    expect(response.json().characters[0].name).toBe('Ada')
  })
  it('returns character empty codes without calling other AI kinds', async () => {
    service.fillCharacters.mockRejectedValue(new AiServiceError('AI_WIZARD_EMPTY', 422))
    const empty = await app.inject({ method: 'POST', url: `${base}/character-fill`, payload: {} })
    expect(empty.statusCode).toBe(422)
    expect(empty.json()).toEqual({ error: 'AI_WIZARD_EMPTY' })
    expect(service.suggest).not.toHaveBeenCalled()
  })
  it('returns timeline fills without persisting through the AI route', async () => {
    service.fillTimeline.mockResolvedValue({
      eras: [{ name: 'Era imperial' }], events: [{ title: 'La coronación', eraName: 'Era imperial' }],
      sources: [source], provider: 'balanced', model: 'test',
    })
    const response = await app.inject({ method: 'POST', url: `${base}/timeline-fill`, payload: { locale: 'es' } })
    expect(response.statusCode).toBe(200)
    expect(service.fillTimeline).toHaveBeenCalledWith('p1', 'u1', { locale: 'es' })
    expect(response.json().eras[0].name).toBe('Era imperial')
    expect(response.json().events[0].title).toBe('La coronación')
  })
  it('returns timeline empty codes without calling other AI kinds', async () => {
    service.fillTimeline.mockRejectedValue(new AiServiceError('AI_WIZARD_INSUFFICIENT', 422))
    const empty = await app.inject({ method: 'POST', url: `${base}/timeline-fill`, payload: {} })
    expect(empty.statusCode).toBe(422)
    expect(empty.json()).toEqual({ error: 'AI_WIZARD_INSUFFICIENT' })
    expect(service.fillCharacters).not.toHaveBeenCalled()
  })
  it('returns tag suggestions without persisting through the AI route', async () => {
    service.suggestTags.mockResolvedValue({
      tags: ['Dead Dove: Do Not Eat'], sources: [source], provider: 'balanced', model: 'test',
    })
    const response = await app.inject({ method: 'POST', url: `${base}/tag-suggestions`, payload: { locale: 'es' } })
    expect(response.statusCode).toBe(200)
    expect(service.suggestTags).toHaveBeenCalledWith('p1', 'u1', { locale: 'es' })
    expect(response.json().tags).toEqual(['Dead Dove: Do Not Eat'])
  })
  it('requires a session for tag suggestions', async () => {
    getSessionUser.mockResolvedValue(null)
    const response = await app.inject({ method: 'POST', url: `${base}/tag-suggestions`, payload: {} })
    expect(response.statusCode).toBe(401)
    expect(service.suggestTags).not.toHaveBeenCalled()
  })
})
