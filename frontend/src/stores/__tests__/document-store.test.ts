import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDocumentStore } from '../document-store'

const { projectsApiMock, documentsApiMock, versionsApiMock, branchStoreMock } = vi.hoisted(() => ({
  projectsApiMock: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStoryMeta: vi.fn(),
    delete: vi.fn(),
  },
  documentsApiMock: {
    getTree: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  versionsApiMock: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    restore: vi.fn(),
  },
  branchStoreMock: { getState: vi.fn() },
}))

vi.mock('@/services/documents', () => ({
  projectsApi: projectsApiMock,
  documentsApi: documentsApiMock,
  versionsApi: versionsApiMock,
}))

vi.mock('@/stores/branch-store', () => ({
  useBranchStore: branchStoreMock,
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
  storyMeta: {},
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

describe('document-store: versiones con rama activa', () => {
  const activeBranch = {
    id: 'b-main',
    documentId: 'doc-1',
    name: 'main',
    sourceVersionId: null,
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    isMain: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.setState(initialState)
    branchStoreMock.getState.mockReturnValue({ activeBranch: null })
    versionsApiMock.list.mockResolvedValue([])
  })

  afterEach(() => {
    useDocumentStore.setState(initialState)
  })

  it('loadVersions pasa branchId cuando la rama activa pertenece al documento', async () => {
    branchStoreMock.getState.mockReturnValue({ activeBranch })

    await useDocumentStore.getState().loadVersions('doc-1')

    expect(versionsApiMock.list).toHaveBeenCalledWith('doc-1', 'b-main')
  })

  it('loadVersions no pasa branchId si la rama activa es de otro documento', async () => {
    branchStoreMock.getState.mockReturnValue({ activeBranch: { ...activeBranch, id: 'b-other', documentId: 'doc-2' } })

    await useDocumentStore.getState().loadVersions('doc-1')

    expect(versionsApiMock.list).toHaveBeenCalledWith('doc-1', undefined)
  })

  it('createVersion crea en la rama activa y recarga las versiones', async () => {
    branchStoreMock.getState.mockReturnValue({ activeBranch })
    versionsApiMock.create.mockResolvedValue({ id: 'ver-1' })

    await useDocumentStore.getState().createVersion('doc-1')

    expect(versionsApiMock.create).toHaveBeenCalledWith('doc-1', 'b-main')
    expect(versionsApiMock.list).toHaveBeenCalled()
  })
})

describe('document-store: storyMeta del proyecto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.setState(initialState)
  })

  afterEach(() => {
    useDocumentStore.setState(initialState)
  })

  it('updateStoryMeta guarda la metadata del wizard en el proyecto', async () => {
    const meta = { rating: 'mature', isFanfic: true, fandom: 'HP' }
    useDocumentStore.setState({
      projects: [{ id: 'folder-1', name: 'Mi novela', description: null, storyMeta: {}, createdAt: 'x', updatedAt: 'x' }],
    })
    projectsApiMock.updateStoryMeta.mockResolvedValue({ id: 'folder-1', name: 'Mi novela', description: null, storyMeta: meta, createdAt: 'x', updatedAt: 'x' })

    await useDocumentStore.getState().updateStoryMeta('folder-1', meta)

    expect(projectsApiMock.updateStoryMeta).toHaveBeenCalledWith('folder-1', meta)
    expect(useDocumentStore.getState().projects[0].storyMeta).toEqual(meta)
  })

  it('updateStoryMeta actualiza currentProject si es el proyecto abierto', async () => {
    const meta = { tags: ['slow burn'] }
    useDocumentStore.setState({
      projects: [{ id: 'folder-1', name: 'Mi novela', description: null, storyMeta: {}, createdAt: 'x', updatedAt: 'x' }],
      currentProject: { id: 'folder-1', name: 'Mi novela', description: null, storyMeta: {}, createdAt: 'x', updatedAt: 'x' },
    })
    projectsApiMock.updateStoryMeta.mockResolvedValue({ id: 'folder-1', name: 'Mi novela', description: null, storyMeta: meta, createdAt: 'x', updatedAt: 'x' })

    await useDocumentStore.getState().updateStoryMeta('folder-1', meta)

    expect(useDocumentStore.getState().currentProject?.storyMeta).toEqual(meta)
  })
})
