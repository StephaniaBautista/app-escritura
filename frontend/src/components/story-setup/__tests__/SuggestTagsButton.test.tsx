import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SuggestTagsButton } from '../SuggestTagsButton'
import { AiRequestError } from '@/services/ai'
import type { StoryMeta } from '@/types/story'

const { suggestTags, toastError, toastSuccess, addOption } = vi.hoisted(() => ({
  suggestTags: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  addOption: vi.fn().mockResolvedValue({ id: 't1', type: 'tag', value: 'Angst', label: 'Angst' }),
}))

vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, suggestTags } }
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
}

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: () => store,
}))

vi.mock('@/stores/options-store', () => ({
  useOptionsStore: (selector: (s: { addOption: typeof addOption }) => unknown) => selector({ addOption }),
}))

describe('SuggestTagsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.documentTree = []
    store.currentDocument = null
  })

  it('does not call the API when the project has no written documents', () => {
    render(<SuggestTagsButton projectId="p1" meta={{}} update={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.suggestTagsWithAi' }))
    expect(suggestTags).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('storySetup.aiEmpty')
  })

  it('merges suggested tags into wizard state through the service layer', async () => {
    store.documentTree = [{ id: 'd1' }]
    const update = vi.fn()
    const meta: StoryMeta = { tags: ['Angst'] }
    suggestTags.mockResolvedValue({
      tags: ['Dead Dove: Do Not Eat', 'Angst'], sources: [], provider: 'deepseek', model: 'test',
    })
    render(<SuggestTagsButton projectId="p1" meta={meta} update={update} />)
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.suggestTagsWithAi' }))
    await waitFor(() => expect(suggestTags).toHaveBeenCalledWith('p1', { locale: 'es' }))
    expect(update).toHaveBeenCalledWith({ tags: ['Angst', 'Dead Dove: Do Not Eat'] })
    expect(addOption).toHaveBeenCalledWith('tag', 'Dead Dove: Do Not Eat', 'Dead Dove: Do Not Eat')
    expect(toastSuccess).toHaveBeenCalledWith('storySetup.tagsSuggested')
  })

  it('shows the write-more message when the server reports insufficient text', async () => {
    store.documentTree = [{ id: 'd1' }]
    suggestTags.mockRejectedValue(new AiRequestError(422, 'AI_WIZARD_INSUFFICIENT'))
    render(<SuggestTagsButton projectId="p1" meta={{}} update={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'storySetup.suggestTagsWithAi' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('storySetup.aiInsufficient'))
  })
})
