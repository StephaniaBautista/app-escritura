import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdviserPanel } from '../AdviserPanel'
import { useAiStore } from '@/stores/ai-store'
import { aiApi } from '@/services/ai'
import { capabilities, conversation } from './fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))
vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { capabilities: vi.fn(), conversations: vi.fn(), conversation: vi.fn(), send: vi.fn(), createConversation: vi.fn(), deleteConversation: vi.fn() } }
})

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useAiStore.setState({ projectId: 'project-1', capabilities, conversations: [conversation], activeId: conversation.id })
  vi.mocked(aiApi.conversations).mockImplementation(async () => useAiStore.getState().conversations)
  vi.mocked(aiApi.capabilities).mockResolvedValue(capabilities)
  vi.mocked(aiApi.send).mockResolvedValue({ conversationId: conversation.id, messages: [] })
})

describe('adviser web search toggle', () => {
  it('sends webSearch only after the writer turns internet lookup on', async () => {
    render(<AdviserPanel projectId="project-1" />)
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    fireEvent.change(screen.getByLabelText('aiApp.message'), { target: { value: '¿Qué clima tiene Madrid?' } })
    fireEvent.click(screen.getByRole('button', { name: 'aiApp.send' }))
    await waitFor(() => expect(aiApi.send).toHaveBeenCalled())
    expect(vi.mocked(aiApi.send).mock.calls[0][2].webSearch).toBeUndefined()
    fireEvent.click(screen.getByTestId('web-search-toggle'))
    fireEvent.change(screen.getByLabelText('aiApp.message'), { target: { value: '¿Qué clima tiene Madrid?' } })
    fireEvent.click(screen.getByRole('button', { name: 'aiApp.send' }))
    await waitFor(() => expect(aiApi.send).toHaveBeenCalledTimes(2))
    expect(vi.mocked(aiApi.send).mock.calls[1][2].webSearch).toBe(true)
  })
})

describe('adviser composer', () => {
  it('lets the writer type before picking a conversation and creates one on send', async () => {
    useAiStore.setState({ conversations: [], activeId: null })
    vi.mocked(aiApi.conversations).mockResolvedValue([])
    vi.mocked(aiApi.createConversation).mockResolvedValue({ ...conversation, id: 'conversation-new' })
    vi.mocked(aiApi.send).mockResolvedValue({ conversationId: 'conversation-new', messages: [] })
    render(<AdviserPanel projectId="project-1" />)
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    const composer = screen.getByLabelText('aiApp.message')
    expect(composer).not.toBeDisabled()
    fireEvent.change(composer, { target: { value: '¿Cómo avanzo el segundo acto?' } })
    fireEvent.click(screen.getByRole('button', { name: 'aiApp.send' }))
    await waitFor(() => expect(aiApi.createConversation).toHaveBeenCalled())
    await waitFor(() => expect(aiApi.send).toHaveBeenCalled())
    expect(vi.mocked(aiApi.createConversation).mock.calls[0][1]).toMatchObject({ mode: 'adviser' })
    expect(vi.mocked(aiApi.send).mock.calls[0][1]).toBe('conversation-new')
  })
})
