import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WizardAiButton } from '../WizardAiButton'
import { AiRequestError } from '@/services/ai'
import type { StoryMeta } from '@/types/story'

const { completeWizard, toastError, toastSuccess, updateProject, updateStoryMeta } = vi.hoisted(() => ({
  completeWizard: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateProject: vi.fn().mockResolvedValue(undefined),
  updateStoryMeta: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, completeWizard } }
})

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: toastError, success: toastSuccess }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const store = {
  documentTree: [] as { id: string }[],
  currentDocument: null as { projectId: string; content: Record<string, unknown> } | null,
  updateProject,
  updateStoryMeta,
}

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: () => store,
}))

const emptyMeta: StoryMeta = {}

function renderButton(props: Partial<Parameters<typeof WizardAiButton>[0]> = {}) {
  return render(
    <WizardAiButton
      projectId="p1"
      stage="description"
      description=""
      meta={emptyMeta}
      onApplied={vi.fn()}
      onSuggestions={vi.fn()}
      {...props}
    />,
  )
}

describe('WizardAiButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.documentTree = []
    store.currentDocument = null
  })

  it('does not call the API when the project has no written documents', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    expect(completeWizard).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('storySetup.aiEmpty')
  })

  it('shows the write-more message when the server reports insufficient text', async () => {
    store.documentTree = [{ id: 'd1' }]
    completeWizard.mockRejectedValue(new AiRequestError(422, 'AI_WIZARD_INSUFFICIENT'))
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('storySetup.aiInsufficient'))
    expect(updateStoryMeta).not.toHaveBeenCalled()
  })

  it('applies a successful fill through existing project APIs for the requested stage', async () => {
    store.documentTree = [{ id: 'd1' }]
    const onApplied = vi.fn()
    const onSuggestions = vi.fn()
    completeWizard.mockResolvedValue({
      description: null,
      meta: { type: ['Romance'] },
      suggestions: [],
      stage: 'basics',
      sources: [], provider: 'deepseek', model: 'test',
    })
    renderButton({ stage: 'basics', onApplied, onSuggestions })
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith('', { type: ['Romance'] }))
    expect(completeWizard).toHaveBeenCalledWith('p1', { locale: 'es', stage: 'basics' })
    expect(updateStoryMeta).toHaveBeenCalled()
    expect(onSuggestions).toHaveBeenCalledWith([])
    expect(toastSuccess).toHaveBeenCalledWith('storySetup.aiApplied')
  })

  it('surfaces suggestions when the stage already has solid data', async () => {
    store.documentTree = [{ id: 'd1' }]
    const onSuggestions = vi.fn()
    const suggestions = [{ field: 'type', title: 'Añade misterio', description: 'Hay una investigación.', value: ['Drama', 'Mystery'] }]
    completeWizard.mockResolvedValue({
      description: null, meta: {}, suggestions, stage: 'basics', sources: [], provider: 'deepseek', model: 'test',
    })
    renderButton({ stage: 'basics', description: 'Ada llega.', meta: { type: ['Drama', 'Romance'] }, onSuggestions })
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(onSuggestions).toHaveBeenCalledWith(suggestions))
    expect(toastSuccess).toHaveBeenCalledWith('storySetup.aiStageSuggested')
  })

  it('stays enabled after a first stage success', async () => {
    store.documentTree = [{ id: 'd1' }]
    completeWizard.mockResolvedValue({
      description: 'Ada vive en Madrid.', meta: {}, suggestions: [], stage: 'description',
      sources: [], provider: 'deepseek', model: 'test',
    })
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('storySetup.aiApplied'))
    expect(screen.getByRole('button', { name: 'storySetup.generateWithAi' })).toBeEnabled()
  })

  it('maps a rejected model payload to the invalid-response message, not the generic retry', async () => {
    store.documentTree = [{ id: 'd1' }]
    completeWizard.mockRejectedValue(new AiRequestError(502, 'AI_INVALID_RESPONSE'))
    renderButton({ stage: 'basics' })
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('aiApp.errors.invalidResponse'))
    expect(toastError).not.toHaveBeenCalledWith('aiApp.errors.request')
  })

  it('re-enables the button after an insufficient-text error', async () => {
    store.documentTree = [{ id: 'd1' }]
    completeWizard.mockRejectedValue(new AiRequestError(422, 'AI_WIZARD_INSUFFICIENT'))
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.generateWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('storySetup.aiInsufficient'))
    expect(screen.getByRole('button', { name: 'storySetup.generateWithAi' })).toBeEnabled()
  })
})
