import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { MultiSelect } from '../MultiSelect'

const { useOptionsStoreMock } = vi.hoisted(() => ({ useOptionsStoreMock: vi.fn() }))

vi.mock('@/stores/options-store', () => ({
  useOptionsStore: useOptionsStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const fandomOptions = [
  { id: 'f1', userId: null, type: 'fandom', value: 'Harry Potter', label: 'Harry Potter', isDefault: false, createdAt: '' },
  { id: 'f2', userId: null, type: 'fandom', value: 'Star Wars', label: 'Star Wars', isDefault: false, createdAt: '' },
]

function Wrapper({ initial = [] as string[] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial)
  return (
    <MultiSelect
      optionType="fandom"
      value={value}
      onChange={setValue}
      placeholder="common.select"
    />
  )
}

describe('MultiSelect', () => {
  let state: { options: Record<string, typeof fandomOptions>; loading: object; loadOptions: ReturnType<typeof vi.fn>; addOption: ReturnType<typeof vi.fn>; removeOption: ReturnType<typeof vi.fn>; getOptions: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    state = {
      options: { fandom: fandomOptions },
      loading: {},
      loadOptions: vi.fn(),
      addOption: vi.fn().mockImplementation(async (type: string, value: string, label: string) => {
        const opt = { id: 'f3', userId: null, type, value, label, isDefault: false, createdAt: '' }
        state.options = { ...state.options, [type]: [...(state.options[type] ?? []), opt] }
        return opt
      }),
      removeOption: vi.fn(),
      getOptions: vi.fn().mockReturnValue(fandomOptions),
    }
    useOptionsStoreMock.mockImplementation((selector?: (s: unknown) => unknown) => {
      if (typeof selector === 'function') return selector(state)
      return state
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('muestra todas las opciones guardadas en el dropdown', () => {
    render(<Wrapper />)

    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toContain('Harry Potter')
    expect(options).toContain('Star Wars')
  })

  it('marca como seleccionada (✓) y deshabilita la opción ya elegida', () => {
    render(<Wrapper initial={['Harry Potter']} />)

    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option'))
    const hp = options.find((o) => o.textContent?.includes('Harry Potter'))
    const sw = options.find((o) => o.textContent?.includes('Star Wars'))
    expect(hp?.textContent).toBe('✓ Harry Potter')
    expect(hp?.disabled).toBe(true)
    expect(sw?.disabled).toBe(false)
  })

  it('agrega una opción nueva al seleccionarla del dropdown', () => {
    render(<Wrapper />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Star Wars' } })
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
  })

  it('selecciona una opción ya guardada al escribirla (sin fallar en silencio)', async () => {
    render(<Wrapper />)

    fireEvent.click(screen.getByRole('button', { name: 'storySetup.addCustom' }))
    const input = screen.getByPlaceholderText('storySetup.addCustomPlaceholder')
    fireEvent.change(input, { target: { value: 'harry potter' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(useOptionsStoreMock().addOption).not.toHaveBeenCalled()
    expect(screen.getByText('Harry Potter')).toBeInTheDocument()
  })

  it('crea y selecciona una opción nueva con optionType', async () => {
    render(<Wrapper />)

    fireEvent.click(screen.getByRole('button', { name: 'storySetup.addCustom' }))
    const input = screen.getByPlaceholderText('storySetup.addCustomPlaceholder')
    fireEvent.change(input, { target: { value: 'Nuevo' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(state.addOption).toHaveBeenCalledWith('fandom', 'Nuevo', 'Nuevo')
    })
    await vi.waitFor(() => {
      expect(screen.getByText('Nuevo')).toBeInTheDocument()
    })
  })
})
