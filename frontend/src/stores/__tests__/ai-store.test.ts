import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth-store'
import { useAiStore } from '../ai-store'
import { aiApi, AiRequestError } from '@/services/ai'
import { capabilities, conversation, message } from '@/components/ai/__tests__/fixtures'
import type { AiCapabilities, AiConversationDetail } from '@/types/ai'

vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { capabilities: vi.fn(), conversations: vi.fn(), conversation: vi.fn(), createConversation: vi.fn(), deleteConversation: vi.fn(), send: vi.fn() } }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useAiStore.setState({ projectId: 'project-1', capabilities, conversations: [conversation], activeId: conversation.id })
})

describe('AI conversation state', () => {
  it('clears all AI context when the authenticated account changes', () => {
    useAiStore.setState({ messages: [message] })
    useAuthStore.setState({ user: { id: 'next-user', email: 'synthetic@example.test' } })
    expect(useAiStore.getState().projectId).toBeNull()
    expect(useAiStore.getState().messages).toEqual([])
    expect(useAiStore.getState().capabilities).toBeNull()
  })

  it('ignores capabilities that finish after switching projects', async () => {
    const old = deferred<AiCapabilities>()
    vi.mocked(aiApi.capabilities).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...capabilities, characters: [] })
    const first = useAiStore.getState().loadCapabilities('project-1')
    await useAiStore.getState().loadCapabilities('project-2')
    old.resolve(capabilities)
    await first
    expect(useAiStore.getState().projectId).toBe('project-2')
    expect(useAiStore.getState().capabilities?.characters).toEqual([])
    expect(useAiStore.getState().messages).toEqual([])
  })

  it('only displays the most recently opened conversation', async () => {
    const old = deferred<AiConversationDetail>()
    vi.mocked(aiApi.conversation).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...conversation, id: 'conversation-2', messages: [] })
    const first = useAiStore.getState().open(conversation.id)
    await useAiStore.getState().open('conversation-2')
    old.resolve({ ...conversation, messages: [message] })
    await first
    expect(useAiStore.getState().activeId).toBe('conversation-2')
    expect(useAiStore.getState().messages).toEqual([])
  })

  it('retries the same idempotent request including scene direction after a network error', async () => {
    vi.mocked(aiApi.send).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ conversationId: conversation.id, messages: [message] })
    expect(await useAiStore.getState().send('Explora el conflicto', 'es', 'Ana quiere volver a casa.')).toBe(false)
    const first = vi.mocked(aiApi.send).mock.calls[0][2]
    useAiStore.getState().setProvider('private')
    expect(await useAiStore.getState().retry()).toBe(true)
    expect(vi.mocked(aiApi.send).mock.calls[1][2]).toEqual(first)
    expect(first.direction).toBe('Ana quiere volver a casa.')
    expect(first.requestId.length).toBeGreaterThanOrEqual(8)
    expect(useAiStore.getState().pending).toEqual({})
    expect(useAiStore.getState().messages).toEqual([message])
  })

  it('includes webSearch on a new turn and keeps it on retry', async () => {
    vi.mocked(aiApi.send).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ conversationId: conversation.id, messages: [message] })
    expect(await useAiStore.getState().send('Consulta pública', 'es', undefined, true)).toBe(false)
    const first = vi.mocked(aiApi.send).mock.calls[0][2]
    expect(first.webSearch).toBe(true)
    expect(await useAiStore.getState().retry()).toBe(true)
    expect(vi.mocked(aiApi.send).mock.calls[1][2]).toEqual(first)
  })

  it('does not duplicate a message when a retried response is already in history', async () => {
    useAiStore.setState({ messages: [message] })
    vi.mocked(aiApi.send).mockResolvedValue({ conversationId: conversation.id, messages: [message] })
    await useAiStore.getState().send('Consulta', 'es')
    expect(useAiStore.getState().messages).toHaveLength(1)
  })

  it('does not reveal late messages in another project', async () => {
    const pending = deferred<{ conversationId: string; messages: typeof message[] }>()
    vi.mocked(aiApi.send).mockReturnValue(pending.promise)
    const sending = useAiStore.getState().send('Consulta', 'es')
    useAiStore.getState().reset()
    useAiStore.setState({ projectId: 'project-2' })
    pending.resolve({ conversationId: conversation.id, messages: [message] })
    await sending
    expect(useAiStore.getState().messages).toEqual([])
    expect(useAiStore.getState().pending).toEqual({})
  })

  it('creates a conversation while the history list is still loading', async () => {
    const pending = deferred<typeof conversation[]>()
    vi.mocked(aiApi.conversations).mockReturnValueOnce(pending.promise)
    vi.mocked(aiApi.createConversation).mockResolvedValue({ ...conversation, id: 'conversation-2', title: 'Nueva' })
    const listing = useAiStore.getState().loadConversations('project-1')
    expect(useAiStore.getState().loading).toBe(true)
    const id = await useAiStore.getState().createConversation({ mode: 'adviser', title: 'Nueva' })
    expect(id).toBe('conversation-2')
    expect(useAiStore.getState().activeId).toBe('conversation-2')
    pending.resolve([])
    await listing
    expect(useAiStore.getState().conversations.some((item) => item.id === 'conversation-2')).toBe(true)
    expect(useAiStore.getState().loading).toBe(false)
  })

  it('clears loading if the writer switches chats while a conversation is being created', async () => {
    const pending = deferred<typeof conversation>()
    vi.mocked(aiApi.createConversation).mockReturnValueOnce(pending.promise)
    vi.mocked(aiApi.conversation).mockResolvedValue({ ...conversation, messages: [] })
    const creating = useAiStore.getState().createConversation({ mode: 'adviser', title: 'Nueva' })
    await useAiStore.getState().open(conversation.id)
    pending.resolve({ ...conversation, id: 'conversation-2', title: 'Nueva' })
    await creating
    expect(useAiStore.getState().loading).toBe(false)
    expect(useAiStore.getState().activeId).toBe(conversation.id)
  })
})
