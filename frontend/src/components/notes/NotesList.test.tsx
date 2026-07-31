import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotesList } from './NotesList'

const { useDocumentStoreMock } = vi.hoisted(() => ({ useDocumentStoreMock: vi.fn() }))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const baseStore = {
  notes: [],
  projectNotes: [],
  notesLoading: false,
  loadNotes: vi.fn().mockResolvedValue(undefined),
  loadProjectNotes: vi.fn().mockResolvedValue(undefined),
  createNote: vi.fn().mockResolvedValue({ id: 'note-1' }),
  createProjectNote: vi.fn().mockResolvedValue({ id: 'note-1' }),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
}

describe('NotesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
  })

  it('muestra el estado vacío cuando no hay notas', () => {
    render(<NotesList documentId="doc-1" projectId="proj-1" />)

    expect(screen.getByText('notes.empty')).toBeInTheDocument()
    expect(screen.getByText('notes.emptyDesc')).toBeInTheDocument()
  })

  it('carga notas del documento por defecto', async () => {
    render(<NotesList documentId="doc-1" projectId="proj-1" />)

    await waitFor(() => {
      expect(baseStore.loadNotes).toHaveBeenCalledWith('doc-1')
    })
  })

  it('cambia al ámbito historia y carga notas del proyecto', async () => {
    render(<NotesList documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.scopeStory' }))

    await waitFor(() => {
      expect(baseStore.loadProjectNotes).toHaveBeenCalledWith('proj-1')
    })
  })

  it('crea una nota en el ámbito activo', async () => {
    render(<NotesList documentId="doc-1" projectId="proj-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'notes.newNote' }))
    const input = screen.getByPlaceholderText('postit.notePlaceholder')
    fireEvent.change(input, { target: { value: 'Mi idea' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(baseStore.createNote).toHaveBeenCalledWith('doc-1', { title: 'Mi idea' })
    })
  })

  it('muestra loader mientras carga', () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, notesLoading: true })

    render(<NotesList documentId="doc-1" projectId="proj-1" />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
