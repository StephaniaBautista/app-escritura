import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { SingleSelect } from '../SingleSelect'

const { useOptionsStoreMock } = vi.hoisted(() => ({ useOptionsStoreMock: vi.fn() }))

vi.mock('@/stores/options-store', () => ({
  useOptionsStore: useOptionsStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const endingOptions = [
  { id: 'e1', userId: null, type: 'ending', value: 'Feliz', label: 'Feliz', isDefault: true, createdAt: '' },
]

function Wrapper({ initial = '' as string }) {
  const [value, setValue] = useState(initial)
  return (
    <SingleSelect
      optionType="ending"
      value={value}
      onChange={setValue}
      placeholder="common.select"
    />
  )
}

describe('SingleSelect', () => {
  let state: { options: Record<string, typeof endingOptions>; loading: object; loadOptions: ReturnType<typeof vi.fn>; addOption: ReturnType<typeof vi.fn>; removeOption: ReturnType<typeof vi.fn>; getOptions: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    state = {
      options: { ending: endingOptions },
      loading: {},
      loadOptions: vi.fn(),
      addOption: vi.fn().mockImplementation(async (type: string, value: string, label: string) => {
        const opt = { id: 'e2', userId: null, type, value, label, isDefault: false, createdAt: '' }
        state.options = { ...state.options, [type]: [...(state.options[type] ?? []), opt] }
        return opt
      }),
      removeOption: vi.fn(),
      getOptions: vi.fn().mockReturnValue(endingOptions),
    }
    useOptionsStoreMock.mockImplementation((selector?: (s: unknown) => unknown) => {
      if (typeof selector === 'function') return selector(state)
      return state
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('selecciona una opción ya guardada al escribirla (sin fallar en silencio)', () => {
    render(<Wrapper />)

    fireEvent.click(screen.getByRole('button', { name: 'storySetup.addCustom' }))
    const input = screen.getByPlaceholderText('storySetup.addCustomPlaceholder')
    fireEvent.change(input, { target: { value: 'feliz' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(state.addOption).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('Feliz')
  })

  it('crea y selecciona una opción nueva con optionType', async () => {
    render(<Wrapper />)

    fireEvent.click(screen.getByRole('button', { name: 'storySetup.addCustom' }))
    const input = screen.getByPlaceholderText('storySetup.addCustomPlaceholder')
    fireEvent.change(input, { target: { value: 'Trágico' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(state.addOption).toHaveBeenCalledWith('ending', 'Trágico', 'Trágico')
    })
    await vi.waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Trágico')
    })
  })
})
