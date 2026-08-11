import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    listGrouped: vi.fn(),
  },
}))

vi.mock('@/services/character-options', () => ({
  characterOptionsApi: apiMock,
}))

import { useCharacterOptionsStore } from '../character-options-store'

const groups = [
  {
    type: 'gender',
    options: [
      { id: 'co-1', type: 'gender', value: 'Femenino', label: 'Femenino', labelEn: 'Female', sortOrder: 1, isDefault: true },
    ],
  },
  {
    type: 'role',
    options: [
      { id: 'co-2', type: 'role', value: 'Principal', label: 'Principal', labelEn: 'Main', sortOrder: 1, isDefault: true },
    ],
  },
] as const

describe('useCharacterOptionsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCharacterOptionsStore.setState({ groups: [], loaded: false, loading: false })
  })

  it('load: guarda grupos agrupados y marca loaded', async () => {
    apiMock.listGrouped.mockResolvedValue(groups)

    await useCharacterOptionsStore.getState().load()

    const state = useCharacterOptionsStore.getState()
    expect(state.loaded).toBe(true)
    expect(state.groups).toEqual(groups)
    expect(state.loading).toBe(false)
  })

  it('load: no vuelve a llamar a la API si ya cargó', async () => {
    apiMock.listGrouped.mockResolvedValue(groups)

    await useCharacterOptionsStore.getState().load()
    await useCharacterOptionsStore.getState().load()

    expect(apiMock.listGrouped).toHaveBeenCalledTimes(1)
  })

  it('load: ante error marca loaded sin romper (híbrido: el formulario sigue funcionando con valores libres)', async () => {
    apiMock.listGrouped.mockRejectedValue(new Error('network'))

    await useCharacterOptionsStore.getState().load()

    expect(useCharacterOptionsStore.getState().loaded).toBe(true)
    expect(useCharacterOptionsStore.getState().groups).toEqual([])
  })

  it('getOptions: devuelve las opciones de un tipo o vacío', async () => {
    apiMock.listGrouped.mockResolvedValue(groups)
    await useCharacterOptionsStore.getState().load()
    const state = useCharacterOptionsStore.getState()

    expect(state.getOptions('gender')).toHaveLength(1)
    expect(state.getOptions('role')).toHaveLength(1)
    expect(state.getOptions('maritalStatus')).toHaveLength(0)
  })
})
