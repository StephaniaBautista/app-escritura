import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useActivityStore } from '../activity-store'
import type { ActivityRow } from '@/services/activity'

const { activityApiMock } = vi.hoisted(() => ({
  activityApiMock: {
    list: vi.fn(),
    create: vi.fn(),
    removeByDocument: vi.fn(),
    removeByFolder: vi.fn(),
  },
}))

vi.mock('@/services/activity', () => ({
  activityApi: activityApiMock,
  toActivityItem: (row: ActivityRow) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    folderId: row.folderId ?? undefined,
    documentId: row.documentId ?? undefined,
    timestamp: new Date(row.createdAt).getTime(),
  }),
}))

const samplePayload = {
  type: 'document_created' as const,
  title: 'Capítulo 1',
  folderId: 'proj-1',
  documentId: 'doc-1',
}

function row(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: 'a1',
    type: 'document_created',
    title: 'Capítulo 1',
    folderId: 'proj-1',
    documentId: 'doc-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('activity-store (backend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivityStore.setState({ activities: [], isLoading: false })
  })

  it('loadActivities carga desde el API y mapea createdAt a timestamp', async () => {
    activityApiMock.list.mockResolvedValue([row()])

    await useActivityStore.getState().loadActivities()

    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(useActivityStore.getState().activities[0].title).toBe('Capítulo 1')
    expect(useActivityStore.getState().activities[0].timestamp).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime(),
    )
  })

  it('loadActivities ante un fallo de red deja la lista vacía sin romper', async () => {
    activityApiMock.list.mockRejectedValue(new Error('red'))

    await useActivityStore.getState().loadActivities()

    expect(useActivityStore.getState().activities).toHaveLength(0)
    expect(useActivityStore.getState().isLoading).toBe(false)
  })

  it('addActivity crea en el API y prepende en el store', async () => {
    activityApiMock.create.mockResolvedValue(row())

    await useActivityStore.getState().addActivity(samplePayload)

    expect(activityApiMock.create).toHaveBeenCalledWith(samplePayload)
    expect(useActivityStore.getState().activities[0].title).toBe('Capítulo 1')
  })

  it('addActivity no rompe el flujo si el API falla', async () => {
    activityApiMock.create.mockRejectedValue(new Error('red'))

    await useActivityStore.getState().addActivity(samplePayload)

    expect(useActivityStore.getState().activities).toHaveLength(0)
  })

  it('removeByDocument borra en el API y filtra localmente', async () => {
    useActivityStore.setState({
      activities: [
        { ...samplePayload, id: 'a1', timestamp: 1 },
        { ...samplePayload, id: 'a2', documentId: 'doc-2', timestamp: 2 },
      ],
    })
    activityApiMock.removeByDocument.mockResolvedValue({ ok: true })

    await useActivityStore.getState().removeByDocument('doc-1')

    expect(activityApiMock.removeByDocument).toHaveBeenCalledWith('doc-1')
    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(useActivityStore.getState().activities[0].documentId).toBe('doc-2')
  })

  it('removeByFolder borra en el API y filtra localmente', async () => {
    useActivityStore.setState({
      activities: [
        { ...samplePayload, id: 'a1', timestamp: 1 },
        { ...samplePayload, id: 'a2', folderId: 'proj-2', timestamp: 2 },
      ],
    })
    activityApiMock.removeByFolder.mockResolvedValue({ ok: true })

    await useActivityStore.getState().removeByFolder('proj-1')

    expect(activityApiMock.removeByFolder).toHaveBeenCalledWith('proj-1')
    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(useActivityStore.getState().activities[0].folderId).toBe('proj-2')
  })
})
