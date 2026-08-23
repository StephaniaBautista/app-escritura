import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listEras: vi.fn(),
    createEra: vi.fn(),
    deleteEra: vi.fn(),
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
  eraId: null,
  characterIds: ['char-1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const eraRow = {
  id: 'era-1',
  projectId: 'proj-1',
  name: 'La Tercera Edad',
  color: null,
  precision: 'year',
  startDate: null,
  endDate: null,
  rollover: 'newYear',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useTimelineStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTimelineStore.setState({ events: [], eras: [], isLoading: false, error: null })
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

  it('loadEras: guarda las épocas', async () => {
    apiMock.listEras.mockResolvedValue([eraRow])

    await useTimelineStore.getState().loadEras('proj-1')

    expect(apiMock.listEras).toHaveBeenCalledWith('proj-1')
    expect(useTimelineStore.getState().eras).toEqual([eraRow])
  })

  it('loadEras: error deja eras vacío sin lanzar', async () => {
    apiMock.listEras.mockRejectedValue(new Error('boom'))

    await useTimelineStore.getState().loadEras('proj-1')

    expect(useTimelineStore.getState().eras).toEqual([])
  })

  it('createEra: añade la época a la lista', async () => {
    apiMock.createEra.mockResolvedValue(eraRow)
    const eraData = { name: 'La Tercera Edad' }

    const era = await useTimelineStore.getState().createEra('proj-1', eraData)

    expect(apiMock.createEra).toHaveBeenCalledWith('proj-1', eraData)
    expect(era).toEqual(eraRow)
    expect(useTimelineStore.getState().eras).toHaveLength(1)
  })

  it('removeEra: elimina la época y desasigna sus eventos', async () => {
    const assigned = { ...eventRow, id: 'ev-2', eraId: 'era-1' }
    useTimelineStore.setState({ events: [eventRow, assigned], eras: [eraRow] })
    apiMock.deleteEra.mockResolvedValue({ message: 'ok' })

    await useTimelineStore.getState().removeEra('era-1')

    expect(useTimelineStore.getState().eras).toHaveLength(0)
    expect(useTimelineStore.getState().events.find((e) => e.id === 'ev-2')?.eraId).toBeNull()
    expect(useTimelineStore.getState().events.find((e) => e.id === 'ev-1')?.eraId).toBeNull()
  })

  it('removeEra: restaura estado si la API falla', async () => {
    useTimelineStore.setState({ eras: [eraRow] })
    apiMock.deleteEra.mockRejectedValue(new Error('boom'))

    await useTimelineStore.getState().removeEra('era-1')

    expect(useTimelineStore.getState().eras).toEqual([eraRow])
  })
})
