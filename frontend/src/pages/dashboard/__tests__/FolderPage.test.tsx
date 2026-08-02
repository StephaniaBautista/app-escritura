import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FolderPage } from '../FolderPage'

const { useDocumentStoreMock } = vi.hoisted(() => ({ useDocumentStoreMock: vi.fn() }))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useParams: () => ({ folderId: 'folder-1' }),
  useSearchParams: () => [new URLSearchParams('tab=documents'), vi.fn()],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const baseStore = {
  currentProject: { id: 'folder-1', name: 'Mi novela', description: null, createdAt: '', updatedAt: '' },
  documentTree: [],
  isLoading: false,
  error: null,
  selectProject: vi.fn(),
  createDocument: vi.fn(),
  updateProject: vi.fn(),
  deleteDocument: vi.fn(),
}

describe('FolderPage: estados de carga', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra un loader mientras isLoading=true y NO el empty state', () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, isLoading: true, documentTree: [] })

    render(<FolderPage />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByText('folder.noDocuments')).not.toBeInTheDocument()
    expect(screen.queryByText('folder.noDocumentsDesc')).not.toBeInTheDocument()
  })

  it('muestra el empty state SOLO cuando terminó de cargar y no hay documentos', () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, isLoading: false, documentTree: [] })

    render(<FolderPage />)

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    expect(screen.getByText('folder.noDocuments')).toBeInTheDocument()
  })

  it('renderiza los documentos cuando la carga terminó y hay contenido', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      isLoading: false,
      documentTree: [{ id: 'doc-1', title: 'Capítulo 1', type: 'document', parentId: null, order: 0, updatedAt: '2026-01-01' }],
    })

    render(<FolderPage />)

    expect(screen.getByText('Capítulo 1')).toBeInTheDocument()
    expect(screen.queryByText('folder.noDocuments')).not.toBeInTheDocument()
  })
})