import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimelineAiButton } from '../TimelineAiButton'
import { AiRequestError } from '@/services/ai'

const { fillTimeline, toastError, toastSuccess } = vi.hoisted(() => ({
  fillTimeline: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, fillTimeline } }
})

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: toastError, success: toastSuccess }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/components/ai/useAiCapabilities', () => ({
  useAiCapabilities: () => ({
    capabilities: { permissions: { suggestions: true }, providers: [{ id: 'balanced', available: true, trainsData: true }] },
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

describe('TimelineAiButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.documentTree = []
    store.currentDocument = null
  })

  it('does not call the API when the project has no written documents', () => {
    render(<TimelineAiButton projectId="p1" empty onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.generateWithAi' }))
    expect(fillTimeline).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('timelineApp.aiEmpty')
  })

  it('shows the write-more message when the server reports insufficient text', async () => {
    store.documentTree = [{ id: 'd1' }]
    fillTimeline.mockRejectedValue(new AiRequestError(422, 'AI_WIZARD_INSUFFICIENT'))
    render(<TimelineAiButton projectId="p1" empty onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.generateWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('timelineApp.aiInsufficient'))
  })

  it('applies a successful fill without saving the timeline', async () => {
    store.documentTree = [{ id: 'd1' }]
    const onFilled = vi.fn()
    fillTimeline.mockResolvedValue({
      eras: [{ name: 'Era imperial' }],
      events: [{ title: 'Coronación' }],
      sources: [], provider: 'balanced', model: 'test',
    })
    render(<TimelineAiButton projectId="p1" empty onFilled={onFilled} />)
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.generateWithAi' }))
    await waitFor(() => expect(onFilled).toHaveBeenCalledWith({
      eras: [{ name: 'Era imperial' }],
      events: [{ title: 'Coronación' }],
      sources: [], provider: 'balanced', model: 'test',
    }))
    expect(fillTimeline).toHaveBeenCalledWith('p1', { locale: 'es' })
    expect(toastSuccess).toHaveBeenCalledWith('timelineApp.aiReady')
  })

  it('labels completion mode when the timeline already has items', async () => {
    store.documentTree = [{ id: 'd1' }]
    fillTimeline.mockResolvedValue({ eras: [], events: [{ title: 'Huida', date: '2' }], sources: [], provider: 'balanced', model: 'test' })
    render(<TimelineAiButton projectId="p1" empty={false} onFilled={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.completeWithAi' }))
    await waitFor(() => expect(fillTimeline).toHaveBeenCalledWith('p1', { locale: 'es' }))
  })
})
