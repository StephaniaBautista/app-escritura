import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDocumentStore } from './document-store'

const { projectsApiMock, documentsApiMock } = vi.hoisted(() => ({
  projectsApiMock: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  documentsApiMock: {
    getTree: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/documents', () => ({
  projectsApi: projectsApiMock,
  documentsApi: documentsApiMock,
}))

const initialState = {
  projects: [],
  currentProject: null,
  documentTree: [],
  currentDocument: null,
  isLoading: false,
  error: null,
}

const pageResponse = {
  id: 'folder-1',
  name: 'Mi novela',
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tree: [
    { id: 'doc-1', title: 'Capítulo 1', type: 'document', parentId: null, order: 0, updatedAt: '2026-01-01T00:00:00.000Z' },
  ],
}

describe('document-store: selectProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.setState(initialState)
  })

  afterEach(() => {
    useDocumentStore.setState(initialState)
  })

  it('hace UNA sola llamada API (endpoint combinado) y setea proyecto + tree', async () => {
    projectsApiMock.getById.mockResolvedValue(pageResponse)

    await useDocumentStore.getState().selectProject('folder-1')

    expect(projectsApiMock.getById).toHaveBeenCalledTimes(1)
    expect(projectsApiMock.getById).toHaveBeenCalledWith('folder-1')
    expect(documentsApiMock.getTree).not.toHaveBeenCalled()

    const state = useDocumentStore.getState()
    expect(state.currentProject?.name).toBe('Mi novela')
    expect(state.documentTree).toHaveLength(1)
    expect(state.documentTree[0].title).toBe('Capítulo 1')
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('muestra currentProject del cache al instante si ya está en projects', async () => {
    const cachedProject = { ...pageResponse, tree: undefined }
    useDocumentStore.setState({ ...initialState, projects: [cachedProject] })

    let resolvePage!: (value: unknown) => void
    projectsApiMock.getById.mockReturnValue(new Promise((resolve) => { resolvePage = resolve }))

    const promise = useDocumentStore.getState().selectProject('folder-1')

    expect(useDocumentStore.getState().currentProject?.name).toBe('Mi novela')
    expect(useDocumentStore.getState().documentTree).toEqual([])

    resolvePage(pageResponse)
    await promise

    const state = useDocumentStore.getState()
    expect(state.documentTree).toHaveLength(1)
    expect(state.isLoading).toBe(false)
  })

  it('limpia el tree anterior mientras carga una carpeta distinta', async () => {
    useDocumentStore.setState({ ...initialState, documentTree: [{ id: 'old', title: 'Anterior', type: 'document', parentId: null, order: 0, updatedAt: 'x' }] })
    projectsApiMock.getById.mockResolvedValue(pageResponse)

    await useDocumentStore.getState().selectProject('folder-1')

    expect(useDocumentStore.getState().documentTree).toHaveLength(1)
    expect(useDocumentStore.getState().documentTree[0].id).toBe('doc-1')
  })

  it('setea error y termina el loading cuando la API falla', async () => {
    projectsApiMock.getById.mockRejectedValue(new Error('No autenticado'))

    await useDocumentStore.getState().selectProject('folder-1')

    const state = useDocumentStore.getState()
    expect(state.error).toBe('No autenticado')
    expect(state.isLoading).toBe(false)
  })
})
