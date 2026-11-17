import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagManager } from '../TagManager'

const { tagsApiMock, suggestTags, toastSuccess, toastError } = vi.hoisted(() => ({
  tagsApiMock: {
    listByProject: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    listAll: vi.fn(),
  },
  suggestTags: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/services/tags', () => ({ tagsApi: tagsApiMock }))
vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, suggestTags } }
})
vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ success: toastSuccess, error: toastError }),
}))
vi.mock('@/hooks/useAiToolProvider', () => ({ useAiToolProvider: () => 'saver' }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const rows = [
  { id: 't1', projectId: 'p1', name: 'Angst', kind: 'freeform', createdAt: '' },
  { id: 't2', projectId: 'p1', name: 'Ada/Lin', kind: 'relationship', createdAt: '' },
]

describe('TagManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tagsApiMock.listByProject.mockResolvedValue(rows)
  })

  it('lists tags grouped by AO3 kind', async () => {
    render(<TagManager projectId="p1" projectTitle="Obra" />)
    await screen.findByText('Angst')
    expect(screen.getByText('Ada/Lin')).toBeTruthy()
    expect(screen.getAllByText('tagsApp.kinds.relationship').length).toBeGreaterThan(0)
    expect(screen.getAllByText('tagsApp.kinds.freeform').length).toBeGreaterThan(0)
  })

  it('creates a tag with the selected kind', async () => {
    tagsApiMock.create.mockResolvedValue({ id: 't3', projectId: 'p1', name: 'Dead Dove: Do Not Eat', kind: 'warning', createdAt: '' })
    render(<TagManager projectId="p1" projectTitle="Obra" />)
    await screen.findByText('Angst')
    fireEvent.change(screen.getByPlaceholderText('tagsApp.addPlaceholder'), { target: { value: 'Dead Dove: Do Not Eat' } })
    fireEvent.click(screen.getByText('tagsApp.add'))
    await waitFor(() => expect(tagsApiMock.create).toHaveBeenCalledWith('p1', { name: 'Dead Dove: Do Not Eat', kind: 'freeform' }))
    expect(toastSuccess).toHaveBeenCalledWith('tagsApp.added')
  })

  it('accepts AI suggestions explicitly as freeform tags', async () => {
    suggestTags.mockResolvedValue({ tags: ['Hurt/Comfort', 'Angst'], sources: [], provider: 'saver', model: 'm' })
    tagsApiMock.create.mockResolvedValue({})
    render(<TagManager projectId="p1" projectTitle="Obra" />)
    await screen.findByText('Angst')
    fireEvent.click(screen.getByText('tagsApp.suggest'))
    await screen.findByText('Hurt/Comfort')
    fireEvent.click(screen.getByText('tagsApp.acceptSuggested'))
    await waitFor(() => expect(tagsApiMock.create).toHaveBeenCalledWith('p1', { name: 'Hurt/Comfort', kind: 'freeform' }))
    expect(tagsApiMock.create).toHaveBeenCalledTimes(1)
  })

  it('removes a tag', async () => {
    tagsApiMock.remove.mockResolvedValue(undefined)
    render(<TagManager projectId="p1" projectTitle="Obra" />)
    const chip = await screen.findByText('Angst')
    const removeButton = chip.parentElement?.querySelector('button')
    fireEvent.click(removeButton as HTMLElement)
    await waitFor(() => expect(tagsApiMock.remove).toHaveBeenCalledWith('t1'))
    expect(toastSuccess).toHaveBeenCalledWith('tagsApp.removed')
  })
})
