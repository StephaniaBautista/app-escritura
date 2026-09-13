import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubplotSuggestions } from '../SubplotSuggestions'
import { aiApi } from '@/services/ai'
import { useAiStore } from '@/stores/ai-store'
import { analysis, capabilities } from './fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }))
vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { analyze: vi.fn(), capabilities: vi.fn() } }
})

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useAiStore.setState({ projectId: 'project-1' })
  vi.mocked(aiApi.analyze).mockResolvedValue({ ...analysis, suggestions: [] })
})

describe('subplot suggestion permissions', () => {
  it('shows the tool and allows a request for a chat-only role', async () => {
    const chatOnly = { ...capabilities, permissions: { chat: true, characters: false, suggestions: false } }
    useAiStore.setState({ capabilities: chatOnly })
    vi.mocked(aiApi.capabilities).mockResolvedValue(chatOnly)
    render(<SubplotSuggestions projectId="project-1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'aiApp.suggestSubplots' }))
    await waitFor(() => expect(aiApi.analyze).toHaveBeenCalledWith('project-1', 'subplot-suggestions', { locale: 'es' }, expect.any(AbortSignal)))
  })

  it('does not expose the tool to a review-only role', async () => {
    const reviewOnly = { ...capabilities, permissions: { chat: false, characters: false, suggestions: true } }
    useAiStore.setState({ capabilities: reviewOnly })
    vi.mocked(aiApi.capabilities).mockResolvedValue(reviewOnly)
    const { container } = render(<SubplotSuggestions projectId="project-1" />)
    await waitFor(() => expect(useAiStore.getState().capabilityLoading).toBe(false))
    expect(container).toBeEmptyDOMElement()
    expect(aiApi.analyze).not.toHaveBeenCalled()
  })
})
