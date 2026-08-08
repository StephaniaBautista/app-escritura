import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorPage } from '../Editor'

const { useDocumentStoreMock, navigateMock, useAutoVersionMock, paramsMock, activityApiMock } = vi.hoisted(() => ({
  useDocumentStoreMock: vi.fn(),
  navigateMock: vi.fn(),
  useAutoVersionMock: vi.fn(() => ({ handleKeystroke: vi.fn() })),
  paramsMock: { projectId: 'proj-1', documentId: 'doc-1' },
  activityApiMock: { addActivity: vi.fn() },
}))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('@/stores/activity-store', () => ({
  useActivityStore: () => ({ addActivity: activityApiMock.addActivity }),
}))

vi.mock('@/hooks/useAutoVersion', () => ({
  useAutoVersion: useAutoVersionMock,
}))

vi.mock('react-router', () => ({
  useParams: () => paramsMock,
  useNavigate: () => navigateMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/editor/DocumentEditor', () => ({
  DocumentEditor: ({ onKeystroke }: { onKeystroke?: () => void }) => (
    <div data-testid="document-editor" onClick={() => onKeystroke?.()}>editor</div>
  ),
}))

vi.mock('@/components/sidebar/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">sidebar</div>,
}))

vi.mock('@/components/editor/PostItWall', () => ({
  PostItWall: () => <div data-testid="postit-wall">postits</div>,
}))

vi.mock('@/components/editor/VersionsPanel', () => ({
  VersionsPanel: () => <div data-testid="versions-panel">versions</div>,
}))

vi.mock('@/components/ui/EditableTitle', () => ({
  EditableTitle: ({ title }: { title: string }) => <h1 data-testid="title">{title}</h1>,
}))

const containerDoc = {
  id: 'doc-1',
  title: 'Mi novela',
  type: 'document',
  parentId: null,
  order: 0,
  projectId: 'proj-1',
  folderId: null,
  userId: 'user-1',
  createdAt: '',
  updatedAt: '2026-08-01T00:00:00.000Z',
  content: {},
  parent: null,
}

const tabDoc = {
  ...containerDoc,
  id: 'tab-1',
  title: 'Pestaña 1',
  type: 'chapter',
  parentId: 'doc-1',
}

const tree = [
  { id: 'doc-1', title: 'Mi novela', type: 'document', parentId: null, order: 0, updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'tab-1', title: 'Pestaña 1', type: 'chapter', parentId: 'doc-1', order: 0, updatedAt: '2026-08-01T00:00:00.000Z' },
]

const baseStore = {
  currentProject: { id: 'proj-1', name: 'Mi novela', description: null, storyMeta: {}, createdAt: '', updatedAt: '' },
  currentDocument: null,
  documentTree: [],
  isLoading: false,
  error: null,
  selectProject: vi.fn(),
  loadDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
}

describe('EditorPage: el documento (contenedor) siempre lleva a una pestaña', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paramsMock.documentId = 'doc-1'
  })

  it('redirige con replace a la primera pestaña cuando se abre un contenedor con pestañas', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      currentDocument: containerDoc,
      documentTree: tree,
    })

    render(<EditorPage />)

    expect(navigateMock).toHaveBeenCalledWith('/app/editor/proj-1/tab-1', { replace: true })
    expect(screen.queryByTestId('document-editor')).not.toBeInTheDocument()
  })

  it('NUNCA monta el editor para un contenedor sin pestañas y no redirige', () => {
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      currentDocument: containerDoc,
      documentTree: [
        { id: 'doc-1', title: 'Mi novela', type: 'document', parentId: null, order: 0, updatedAt: '2026-08-01T00:00:00.000Z' },
      ],
    })

    render(<EditorPage />)

    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('document-editor')).not.toBeInTheDocument()
  })

  it('sí monta el editor y NO redirige cuando el documento es una pestaña', () => {
    paramsMock.documentId = 'tab-1'
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      currentDocument: tabDoc,
      documentTree: tree,
    })

    render(<EditorPage />)

    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('document-editor')).toBeInTheDocument()
  })

  it('registra la actividad document_edited al editar (una vez por documento, throttle 60s)', () => {
    paramsMock.documentId = 'tab-1'
    useDocumentStoreMock.mockReturnValue({
      ...baseStore,
      currentDocument: tabDoc,
      documentTree: tree,
    })

    render(<EditorPage />)
    const editor = screen.getByTestId('document-editor')

    fireEvent.click(editor)
    fireEvent.click(editor)

    expect(activityApiMock.addActivity).toHaveBeenCalledTimes(1)
    expect(activityApiMock.addActivity).toHaveBeenCalledWith({
      type: 'document_edited',
      title: 'Pestaña 1',
      folderId: 'proj-1',
      documentId: 'tab-1',
    })
  })
})
