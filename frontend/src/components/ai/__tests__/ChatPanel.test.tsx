import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from '../ChatPanel'
import { useAiStore } from '@/stores/ai-store'
import { aiApi } from '@/services/ai'
import { capabilities, conversation } from './fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))
vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { conversations: vi.fn(), conversation: vi.fn() } }
})

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useAiStore.setState({ projectId: 'project-1', capabilities, conversations: [conversation], activeId: conversation.id })
  vi.mocked(aiApi.conversations).mockImplementation(async () => useAiStore.getState().conversations)
})

describe('chat scene direction isolation', () => {
  it('clears direction and the message draft when opening a different conversation', async () => {
    const second = { ...conversation, id: 'conversation-2', title: 'Otra consulta' }
    useAiStore.setState({ conversations: [conversation, second] })
    vi.mocked(aiApi.conversation).mockResolvedValue({ ...second, messages: [] })
    render(<ChatPanel projectId="project-1" />)
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    fireEvent.change(screen.getByLabelText('aiApp.sceneDirection'), { target: { value: 'Ana vuelve a casa.' } })
    fireEvent.change(screen.getByLabelText('aiApp.message'), { target: { value: 'Explora el conflicto.' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'aiApp.history' }), { target: { value: second.id } })
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    expect(screen.getByLabelText('aiApp.sceneDirection')).toHaveValue('')
    expect(screen.getByLabelText('aiApp.message')).toHaveValue('')
  })

  it('clears direction when the project context changes without remounting the chat', async () => {
    const { rerender } = render(<ChatPanel projectId="project-1" />)
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    fireEvent.change(screen.getByLabelText('aiApp.sceneDirection'), { target: { value: 'Dirección exclusiva del primer proyecto.' } })
    const second = { ...conversation, id: 'conversation-2', projectId: 'project-2' }
    act(() => { useAiStore.setState({ projectId: 'project-2', conversations: [second], activeId: second.id }) })
    rerender(<ChatPanel projectId="project-2" />)
    await waitFor(() => expect(useAiStore.getState().loading).toBe(false))
    expect(screen.getByLabelText('aiApp.sceneDirection')).toHaveValue('')
  })
})
