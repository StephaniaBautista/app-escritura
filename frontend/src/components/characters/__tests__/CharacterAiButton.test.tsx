import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CharacterAiButton } from '../CharacterAiButton'
import { AiRequestError } from '@/services/ai'

const { fillCharacters, toastError, toastSuccess } = vi.hoisted(() => ({
  fillCharacters: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, fillCharacters } }
})

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: toastError, success: toastSuccess }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/components/ai/useAiCapabilities', () => ({
  useAiCapabilities: () => ({
    capabilities: { permissions: { characters: true }, providers: [{ id: 'balanced', available: true, trainsData: true }] },
    loading: false, error: null, retry: vi.fn(),
  }),
}))

const store = {
  documentTree: [] as { id: string }[],
  currentDocument: null as { projectId: string; content: Record<string, unknown> } | null,
}

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: () => store,
}))

describe('CharacterAiButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.documentTree = []
    store.currentDocument = null
  })

  it('does not call the API when the project has no written documents', () => {
    render(<CharacterAiButton projectId="p1" onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.generateWithAi' }))
    expect(fillCharacters).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('characterApp.aiEmpty')
  })

  it('shows the write-more message when the server reports insufficient text', async () => {
    store.documentTree = [{ id: 'd1' }]
    fillCharacters.mockRejectedValue(new AiRequestError(422, 'AI_WIZARD_INSUFFICIENT'))
    render(<CharacterAiButton projectId="p1" onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.generateWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('characterApp.aiInsufficient'))
  })

  it('applies a successful fill without saving the character', async () => {
    store.documentTree = [{ id: 'd1' }]
    const onFilled = vi.fn()
    fillCharacters.mockResolvedValue({
      characters: [{ name: 'Ada', description: 'Vive en Madrid.' }],
      sources: [], provider: 'balanced', model: 'test',
    })
    render(<CharacterAiButton projectId="p1" name="Ada" onFilled={onFilled} />)
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.generateWithAi' }))
    await waitFor(() => expect(onFilled).toHaveBeenCalledWith([{ name: 'Ada', description: 'Vive en Madrid.' }]))
    expect(fillCharacters).toHaveBeenCalledWith('p1', { locale: 'es', name: 'Ada' })
    expect(toastSuccess).toHaveBeenCalledWith('characterApp.aiReady')
  })

  it('labels completion mode when editing an existing character', async () => {
    store.documentTree = [{ id: 'd1' }]
    fillCharacters.mockResolvedValue({ characters: [{ name: 'Ada', age: '30' }], sources: [], provider: 'balanced', model: 'test' })
    render(<CharacterAiButton projectId="p1" characterId="c1" onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.completeWithAi' }))
    await waitFor(() => expect(fillCharacters).toHaveBeenCalledWith('p1', { locale: 'es', characterId: 'c1' }))
  })
})
