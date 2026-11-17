import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiMock, projectsApiMock } = vi.hoisted(() => ({
  apiMock: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    listEras: vi.fn(),
    createEra: vi.fn(),
    updateEra: vi.fn(),
    deleteEra: vi.fn(),
  },
  projectsApiMock: {
    getById: vi.fn(),
    updateTimelineConfig: vi.fn(),
  },
}))

vi.mock('@/services/timeline', () => ({
  timelineApi: apiMock,
}))

vi.mock('@/services/documents', () => ({
  projectsApi: projectsApiMock,
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
  icon: null,
  color: null,
  groupName: null,
  precision: 'year',
  endDate: null,
  label: null,
  labelColor: null,
  imageUrl: null,
  relatedEventIds: [],
  relatedDocumentIds: [],
  subplotId: null,
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
    useTimelineStore.setState({ events: [], eras: [], timelineConfig: { timeSystem: 'relative' }, isLoading: false, isSavingTimelineConfig: false, error: null })
  })

  it('loadConfig: normaliza timelineConfig del proyecto', async () => {
    projectsApiMock.getById.mockResolvedValue({
      id: 'proj-1',
      timelineConfig: { timeSystem: 'era', beforeLabel: 'AC', afterLabel: 'DC' },
    })

    await useTimelineStore.getState().loadConfig('proj-1')

    expect(projectsApiMock.getById).toHaveBeenCalledWith('proj-1')
    expect(useTimelineStore.getState().timelineConfig).toEqual({
      timeSystem: 'era',
      beforeLabel: 'AC',
      afterLabel: 'DC',
    })
  })

  it('updateTimelineConfig: persiste y actualiza el store', async () => {
    projectsApiMock.updateTimelineConfig.mockResolvedValue({
      id: 'proj-1',
      timelineConfig: { timeSystem: 'era', beforeLabel: 'a.F.', afterLabel: 'd.F.' },
    })

    await useTimelineStore.getState().updateTimelineConfig('proj-1', {
      timeSystem: 'era',
      beforeLabel: 'a.F.',
      afterLabel: 'd.F.',
    })

    expect(projectsApiMock.updateTimelineConfig).toHaveBeenCalledWith('proj-1', {
      timeSystem: 'era',
      beforeLabel: 'a.F.',
      afterLabel: 'd.F.',
    })
    expect(useTimelineStore.getState().timelineConfig.afterLabel).toBe('d.F.')
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

  it('uploadImage: reemplaza el evento con la imagen subida', async () => {
    useTimelineStore.setState({ events: [eventRow] })
    apiMock.uploadImage.mockResolvedValue({ ...eventRow, imageUrl: 'https://x/img.png' })

    const updated = await useTimelineStore.getState().uploadImage('ev-1', 'data:image/png;base64,AAAA')

    expect(apiMock.uploadImage).toHaveBeenCalledWith('ev-1', 'data:image/png;base64,AAAA')
    expect(updated?.imageUrl).toBe('https://x/img.png')
    expect(useTimelineStore.getState().events[0].imageUrl).toBe('https://x/img.png')
  })

  it('uploadImage: devuelve null y conserva el evento si la API falla', async () => {
    useTimelineStore.setState({ events: [eventRow] })
    apiMock.uploadImage.mockRejectedValue(new Error('boom'))

    const updated = await useTimelineStore.getState().uploadImage('ev-1', 'data:image/png;base64,AAAA')

    expect(updated).toBeNull()
    expect(useTimelineStore.getState().events[0]).toEqual(eventRow)
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

  it('updateEra: reemplaza la época editada', async () => {
    useTimelineStore.setState({ eras: [eraRow] })
    apiMock.updateEra.mockResolvedValue({ ...eraRow, name: 'Segunda Edad', color: '#2d6b6b' })

    const era = await useTimelineStore.getState().updateEra('era-1', { name: 'Segunda Edad', color: '#2d6b6b' })

    expect(apiMock.updateEra).toHaveBeenCalledWith('era-1', { name: 'Segunda Edad', color: '#2d6b6b' })
    expect(era?.name).toBe('Segunda Edad')
    expect(useTimelineStore.getState().eras[0].color).toBe('#2d6b6b')
  })

  it('updateEra: devuelve null si la API falla', async () => {
    useTimelineStore.setState({ eras: [eraRow] })
    apiMock.updateEra.mockRejectedValue(new Error('boom'))

    const era = await useTimelineStore.getState().updateEra('era-1', { name: 'X' })

    expect(era).toBeNull()
    expect(useTimelineStore.getState().eras).toEqual([eraRow])
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
