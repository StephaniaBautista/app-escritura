import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/timeline', () => ({
  timelineApi: apiMock,
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({ success: vi.fn(), error: vi.fn() }),
  },
}))

vi.mock('@/i18n', () => ({ default: { t: (k: string) => k } }))

import { useTimelineStore } from '../timeline-store'

const eventRow = {
  id: 'ev-1',
  projectId: 'proj-1',
  title: 'La caída',
  date: 'Año 3',
  description: null,
  order: 0,
  characterIds: ['char-1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useTimelineStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTimelineStore.setState({ events: [], isLoading: false, error: null })
  })

  it('load: guarda eventos ordenados', async () => {
    apiMock.list.mockResolvedValue([eventRow])

    await useTimelineStore.getState().load('proj-1')

    expect(apiMock.list).toHaveBeenCalledWith('proj-1')
    expect(useTimelineStore.getState().events).toEqual([eventRow])
  })

  it('load: error queda en state sin lanzar', async () => {
    apiMock.list.mockRejectedValue(new Error('boom'))

    await useTimelineStore.getState().load('proj-1')

    expect(useTimelineStore.getState().error).toBe('boom')
  })

  it('create: añade el evento a la lista', async () => {
    apiMock.create.mockResolvedValue(eventRow)

    const event = await useTimelineStore.getState().create('proj-1', { title: 'La caída' })

    expect(event).toEqual(eventRow)
    expect(useTimelineStore.getState().events).toHaveLength(1)
  })

  it('update: reemplaza el evento editado', async () => {
    useTimelineStore.setState({ events: [eventRow] })
    apiMock.update.mockResolvedValue({ ...eventRow, title: 'Nuevo' })

    await useTimelineStore.getState().update('ev-1', { title: 'Nuevo' })

    expect(useTimelineStore.getState().events[0].title).toBe('Nuevo')
  })

  it('remove: elimina el evento y muestra toast', async () => {
    useTimelineStore.setState({ events: [eventRow] })
    apiMock.delete.mockResolvedValue({ message: 'ok' })

    await useTimelineStore.getState().remove('ev-1')

    expect(useTimelineStore.getState().events).toHaveLength(0)
  })

  it('move: intercambia orden con el vecino y persiste ambos', async () => {
    const a = { ...eventRow, id: 'a', order: 0 }
    const b = { ...eventRow, id: 'b', order: 1 }
    useTimelineStore.setState({ events: [a, b] })

    await useTimelineStore.getState().move('a', 'down')

    expect(useTimelineStore.getState().events.map((e) => e.id)).toEqual(['b', 'a'])
    expect(apiMock.update).toHaveBeenCalledWith('a', { order: 1 })
    expect(apiMock.update).toHaveBeenCalledWith('b', { order: 0 })
  })

  it('move: no hace nada en bordes', async () => {
    useTimelineStore.setState({ events: [eventRow] })

    await useTimelineStore.getState().move('ev-1', 'down')

    expect(apiMock.update).not.toHaveBeenCalled()
  })
})
