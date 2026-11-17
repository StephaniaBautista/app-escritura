import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CharacterChat } from '../CharacterChat'
import { capabilities as baseCapabilities, character, message } from './fixtures'
import type { AiCapabilities, AiConversation, AiMessage } from '@/types/ai'

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  capabilities: null as AiCapabilities | null,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/stores/ai-store', () => {
  const hook = () => mocks.state
  hook.getState = () => mocks.state
  return { useAiStore: hook }
})

vi.mock('../useAiCapabilities', () => ({
  useAiCapabilities: () => ({ capabilities: mocks.capabilities, loading: false, error: null, retry: vi.fn() }),
}))

vi.mock('../AiShared', () => ({
  AiError: () => null,
  AiSources: () => null,
  AiConsentNote: () => null,
  AiProviderSelect: () => null,
  ProtectedAiText: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/ConfirmDialog', () => ({ ConfirmDialog: () => null }))

const conversation: AiConversation = {
  id: 'conversation-1', projectId: 'project-1', mode: 'character', title: 'Ana · 12 sept',
  characterId: 'character-1', chapterId: 'chapter-1', createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
}

const renderChat = (props: Partial<React.ComponentProps<typeof CharacterChat>> = {}) => {
  const onSelectScope = vi.fn()
  const onBack = vi.fn()
  render(
    <MemoryRouter>
      <CharacterChat
        projectId="project-1"
        character={character}
        scopeId="chapter-1"
        onSelectScope={onSelectScope}
        onBack={onBack}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSelectScope, onBack }
}

const composer = () => screen.getByLabelText('aiApp.message')

describe('CharacterChat', () => {
  beforeEach(() => {
    mocks.capabilities = baseCapabilities
    mocks.state = {
      projectId: 'project-1', capabilities: baseCapabilities, conversations: [], activeId: null,
      messages: [], loading: false, sending: false, error: null, pending: {},
      loadConversations: vi.fn(async () => undefined),
      createConversation: vi.fn(async () => 'conversation-1'),
      send: vi.fn(async () => true),
      open: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      retry: vi.fn(async () => true),
    }
  })

  it('starts the conversation on the first message without asking for a new chat', async () => {
    const { createConversation, send } = { createConversation: mocks.state.createConversation as ReturnType<typeof vi.fn>, send: mocks.state.send as ReturnType<typeof vi.fn> }
    renderChat()

    fireEvent.change(composer(), { target: { value: '¿Quién eres?' } })
    fireEvent.click(screen.getByRole('button', { name: 'aiApp.send' }))

    await waitFor(() => expect(createConversation).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'character', characterId: 'character-1', chapterId: 'chapter-1',
    })))
    expect(send).toHaveBeenCalledWith('¿Quién eres?', 'es')
  })

  it('offers the character greeting and opening questions that fill the composer', () => {
    renderChat()

    expect(screen.getByText('aiApp.characterIntro')).toBeInTheDocument()
    expect(screen.getByText('aiApp.openersLabel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'aiApp.openerScene' }))

    expect(composer()).toHaveValue('aiApp.openerScene')
  })

  it('renders in-scene action beats in italics next to the dialogue', () => {
    mocks.state = {
      ...mocks.state,
      conversations: [conversation],
      activeId: conversation.id,
      messages: [{ ...message, id: 'assistant-1', content: '*Se gira hacia la puerta.* No lo sé.' } as AiMessage],
    }
    renderChat()

    const beat = screen.getByText('Se gira hacia la puerta.')
    expect(beat.tagName).toBe('EM')
    expect(screen.getByText('No lo sé.')).toBeInTheDocument()
  })

  it('shows the thread of the active conversation with the character voice', () => {
    mocks.state = {
      ...mocks.state,
      conversations: [conversation],
      activeId: conversation.id,
      messages: [
        { ...message, id: 'assistant-1', content: 'Soy Ana.' } as AiMessage,
        { ...message, id: 'user-1', role: 'user', content: '¿Quién eres?' } as AiMessage,
      ],
    }
    renderChat()

    expect(screen.getByText('Soy Ana.')).toBeInTheDocument()
    expect(screen.getByText('¿Quién eres?')).toBeInTheDocument()
    expect(screen.getAllByText('Ana')).toHaveLength(2)
  })

  it('lists chapters and nested subpages as the knowledge boundary', () => {
    const { onSelectScope } = renderChat()

    const select = screen.getByLabelText('aiApp.knowledgeScope')
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.textContent ?? '')

    expect(options).toEqual(['aiApp.scopeChapter · Capítulo 1', '\u00A0\u00A0aiApp.scopeSubpage · Página 1'])

    fireEvent.change(select, { target: { value: 'page-1' } })

    expect(onSelectScope).toHaveBeenCalledWith('page-1')
  })

  it('asks for a manuscript instead of talking when the class has nothing written yet', () => {
    mocks.capabilities = { ...baseCapabilities, pages: [] }
    renderChat()

    expect(screen.getByRole('link', { name: 'characterApp.noManuscriptLink' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'aiApp.send' })).toBeDisabled()
  })
})
