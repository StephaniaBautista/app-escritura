import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

const { useDocumentStoreMock, useNavigateMock } = vi.hoisted(() => ({
  useDocumentStoreMock: vi.fn(),
  useNavigateMock: vi.fn(),
}))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-router', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useNavigate: () => useNavigateMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'editorApp.defaultTabName' ? 'Pestaña' : key),
  }),
}))

const baseStore = {
  documentTree: [],
  currentDocument: { id: 'doc-A', title: 'Documento A', type: 'document', parentId: null, order: 0, updatedAt: '', content: {}, projectId: 'project-1', folderId: null, userId: 'u1', createdAt: '' },
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  duplicateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}

describe('Sidebar: botón + (nueva pestaña)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNavigateMock.mockReturnValue(vi.fn())
  })

  it('crea la primera pestaña con nombre por defecto "Pestaña 1" colgando del documento', async () => {
    const createDocument = vi.fn().mockResolvedValue({ id: 'tab-1' })
    useDocumentStoreMock.mockReturnValue({ ...baseStore, createDocument })

    render(<Sidebar />)

    fireEvent.click(screen.getByLabelText('editorApp.newTab'))

    await waitFor(() => {
      expect(createDocument).toHaveBeenCalledWith({
        title: 'Pestaña 1',
        type: 'chapter',
        projectId: 'project-1',
        parentId: 'doc-A',
      })
    })
  })

  it('numera pestañas siguientes: segunda pestaña → "Pestaña 2"', async () => {
    const createDocument = vi.fn().mockResolvedValue({ id: 'tab-2' })
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      documentTree: [
        { id: 'doc-A', title: 'Documento A', type: 'document', parentId: null, order: 0, updatedAt: '' },
        { id: 'tab-1', title: 'Pestaña 1', type: 'chapter', parentId: 'doc-A', order: 0, updatedAt: '' },
      ],
      createDocument,
    })

    render(<Sidebar />)

    fireEvent.click(screen.getByLabelText('editorApp.newTab'))

    await waitFor(() => {
      expect(createDocument).toHaveBeenCalledWith({
        title: 'Pestaña 2',
        type: 'chapter',
        projectId: 'project-1',
        parentId: 'doc-A',
      })
    })
  })

  it('navega a la pestaña recién creada', async () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, createDocument: vi.fn().mockResolvedValue({ id: 'tab-1' }) })

    render(<Sidebar />)

    fireEvent.click(screen.getByLabelText('editorApp.newTab'))

    await waitFor(() => {
      expect(useNavigateMock).toHaveBeenCalledWith('/app/editor/project-1/tab-1')
    })
  })

  it('no muestra el botón + cuando no hay documento activo', () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, currentDocument: null })

    render(<Sidebar />)

    expect(screen.queryByLabelText('editorApp.newTab')).not.toBeInTheDocument()
  })
})

describe('Sidebar: eliminar pestaña con loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNavigateMock.mockReturnValue(vi.fn())
  })

  it('muestra spinner en el diálogo mientras elimina, cierra y navega al terminar', async () => {
    let resolveDelete!: () => void
    const deleteDocument = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve }),
    )
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      documentTree: [
        { id: 'doc-A', title: 'Documento A', type: 'document', parentId: null, order: 0, updatedAt: '' },
        { id: 'tab-1', title: 'Pestaña 1', type: 'chapter', parentId: 'doc-A', order: 0, updatedAt: '' },
        { id: 'tab-2', title: 'Pestaña 2', type: 'chapter', parentId: 'doc-A', order: 1, updatedAt: '' },
      ],
      currentDocument: { ...baseStore.currentDocument, id: 'tab-1', type: 'chapter', parentId: 'doc-A' },
      deleteDocument,
    })

    render(<Sidebar />)

    fireEvent.click(screen.getAllByLabelText('common.moreOptions')[0])
    fireEvent.click(screen.getByText('editorApp.delete'))

    expect(screen.getByText('folder.confirmDelete')).toBeInTheDocument()

    fireEvent.click(screen.getByText('common.delete'))

    expect(deleteDocument).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('confirm-loading-spinner')).toBeInTheDocument()
    expect(screen.getByText('folder.confirmDelete')).toBeInTheDocument()

    resolveDelete()

    await waitFor(() => {
      expect(screen.queryByText('folder.confirmDelete')).not.toBeInTheDocument()
    })
    expect(useNavigateMock).toHaveBeenCalledWith('/app/editor/project-1')
  })
})