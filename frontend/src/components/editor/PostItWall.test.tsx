import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PostItWall } from './PostItWall'

const { useDocumentStoreMock } = vi.hoisted(() => ({ useDocumentStoreMock: vi.fn() }))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const makeNote = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  id,
  title: `Nota ${id}`,
  content: 'contenido',
  documentId: 'doc-1',
  projectId: 'proj-1',
  isHidden: false,
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const baseStore = {
  notes: [],
  projectNotes: [],
  loadNotes: vi.fn().mockResolvedValue(undefined),
  loadProjectNotes: vi.fn().mockResolvedValue(undefined),
  createNote: vi.fn().mockResolvedValue({ id: 'n1' }),
  createProjectNote: vi.fn().mockResolvedValue({ id: 'n1' }),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
}

describe('PostItWall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
  })

  it('carga notas del documento y del proyecto al montar', async () => {
    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    await waitFor(() => {
      expect(baseStore.loadNotes).toHaveBeenCalledWith('doc-1')
      expect(baseStore.loadProjectNotes).toHaveBeenCalledWith('proj-1')
    })
  })

  it('muestra notas de ambos ámbitos en el filtro Todas', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      notes: [makeNote('a')],
      projectNotes: [makeNote('b')],
    })

    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    expect(screen.getByText('Nota a')).toBeInTheDocument()
    expect(screen.getByText('Nota b')).toBeInTheDocument()
  })

  it('filtra solo notas de historia', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      notes: [makeNote('a')],
      projectNotes: [makeNote('b')],
    })

    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.filterStory' }))

    expect(screen.queryByText('Nota a')).not.toBeInTheDocument()
    expect(screen.getByText('Nota b')).toBeInTheDocument()
  })

  it('filtra solo notas del documento', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      notes: [makeNote('a')],
      projectNotes: [makeNote('b')],
    })

    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.filterDocument' }))

    expect(screen.getByText('Nota a')).toBeInTheDocument()
    expect(screen.queryByText('Nota b')).not.toBeInTheDocument()
  })

  it('no muestra notas ocultas en Todas y las muestra en Ocultas con badge', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      notes: [makeNote('a'), makeNote('h', { isHidden: true })],
      projectNotes: [],
    })

    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    expect(screen.queryByText('Nota h')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /postit.filterHidden/ }))

    expect(screen.getByText('Nota h')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'postit.restore' })).toBeInTheDocument()
  })

  it('oculta una nota visible con el ojo', async () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      notes: [makeNote('a')],
      projectNotes: [],
    })

    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.hide' }))

    await waitFor(() => {
      expect(baseStore.updateNote).toHaveBeenCalledWith('a', { isHidden: true })
    })
  })

  it('crea nota de historia desde el menú +', async () => {
    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.newNote' }))
    fireEvent.click(screen.getByRole('button', { name: 'postit.scopeStory' }))
    const input = screen.getByPlaceholderText('postit.notePlaceholder')
    fireEvent.change(input, { target: { value: 'Regla del mundo' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(baseStore.createProjectNote).toHaveBeenCalledWith('proj-1', { title: 'Regla del mundo' })
    })
  })

  it('colapsa y expande la pared', () => {
    render(<PostItWall documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.collapse' }))
    expect(screen.queryByRole('button', { name: 'postit.filterAll' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'postit.expand' }))
    expect(screen.getByRole('button', { name: 'postit.filterAll' })).toBeInTheDocument()
  })
})
