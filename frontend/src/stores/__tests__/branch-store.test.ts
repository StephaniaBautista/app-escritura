import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBranchStore } from '../branch-store'

const { branchesApiMock } = vi.hoisted(() => ({
  branchesApiMock: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
    getGraph: vi.fn(),
    merge: vi.fn(),
  },
}))

vi.mock('@/services/branches', () => ({ branchesApi: branchesApiMock }))

const mainBranch = {
  id: 'b-main',
  documentId: 'doc-1',
  name: 'main',
  sourceVersionId: null,
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  isMain: true,
}

const featureBranch = {
  id: 'b-feature',
  documentId: 'doc-1',
  name: 'feature',
  sourceVersionId: 'v-1',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  isMain: false,
}

const initialState = {
  branches: [],
  activeBranch: null,
  graphData: null,
  loading: false,
  error: null,
}

describe('branch-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBranchStore.setState(initialState)
  })

  afterEach(() => {
    useBranchStore.setState(initialState)
  })

  it('loadBranches: carga ramas y selecciona main por defecto', async () => {
    branchesApiMock.list.mockResolvedValue([featureBranch, mainBranch])

    await useBranchStore.getState().loadBranches('doc-1')

    expect(branchesApiMock.list).toHaveBeenCalledWith('doc-1')
    expect(useBranchStore.getState().branches).toHaveLength(2)
    expect(useBranchStore.getState().activeBranch?.id).toBe('b-main')
  })

  it('loadBranches: mantiene la rama activa si sigue existiendo', async () => {
    branchesApiMock.list.mockResolvedValue([featureBranch, mainBranch])
    useBranchStore.setState({ activeBranch: featureBranch })

    await useBranchStore.getState().loadBranches('doc-1')

    expect(useBranchStore.getState().activeBranch?.id).toBe('b-feature')
  })

  it('createBranch: añade la rama nueva a la lista', async () => {
    branchesApiMock.create.mockResolvedValue(featureBranch)

    const created = await useBranchStore.getState().createBranch('doc-1', { name: 'feature', sourceVersionId: 'v-1' })

    expect(created).toEqual(featureBranch)
    expect(useBranchStore.getState().branches).toContainEqual(featureBranch)
  })

  it('deleteBranch: elimina rama y cambia la activa si era la borrada', async () => {
    branchesApiMock.delete.mockResolvedValue({ ok: true })
    useBranchStore.setState({ branches: [mainBranch, featureBranch], activeBranch: featureBranch })

    await useBranchStore.getState().deleteBranch('b-feature')

    expect(useBranchStore.getState().branches).toHaveLength(1)
    expect(useBranchStore.getState().activeBranch?.id).toBe('b-main')
  })

  it('mergeBranch: sin conflictos devuelve merged true y sin error', async () => {
    branchesApiMock.merge.mockResolvedValue({ merged: true, version: { id: 'commit-1' } })

    const result = await useBranchStore.getState().mergeBranch('b-feature', 'b-main')

    expect(branchesApiMock.merge).toHaveBeenCalledWith('b-feature', { targetBranchId: 'b-main' })
    expect(result.merged).toBe(true)
    expect(useBranchStore.getState().error).toBeNull()
  })

  it('mergeBranch: con conflictos devuelve la lista sin lanzar error', async () => {
    branchesApiMock.merge.mockResolvedValue({
      merged: false,
      conflicts: [{ index: 0, kind: 'modified', base: null, ours: { type: 'paragraph' }, theirs: { type: 'paragraph' } }],
      mergedContent: { type: 'doc', content: [null] },
    })

    const result = await useBranchStore.getState().mergeBranch('b-feature', 'b-main')

    expect(result.merged).toBe(false)
    expect(result.conflicts).toHaveLength(1)
  })

  it('mergeBranch: envía la resolución cuando se provee', async () => {
    branchesApiMock.merge.mockResolvedValue({ merged: true, version: { id: 'commit-1' } })
    const content = { type: 'doc', content: [] }

    await useBranchStore.getState().mergeBranch('b-feature', 'b-main', { content })

    expect(branchesApiMock.merge).toHaveBeenCalledWith('b-feature', { targetBranchId: 'b-main', resolution: { content } })
  })

  it('mergeBranch: propaga el error del API', async () => {
    branchesApiMock.merge.mockRejectedValue(new Error('MERGE_FAILED'))

    await expect(useBranchStore.getState().mergeBranch('b-feature', 'b-main')).rejects.toThrow('MERGE_FAILED')
    expect(useBranchStore.getState().error).toBe('MERGE_FAILED')
  })
})
