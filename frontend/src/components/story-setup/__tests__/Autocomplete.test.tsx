import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { Autocomplete } from '../Autocomplete'

const { useOptionsStoreMock } = vi.hoisted(() => ({ useOptionsStoreMock: vi.fn() }))

vi.mock('@/stores/options-store', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/stores/options-store')>()
  return { ...mod, useOptionsStore: useOptionsStoreMock }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const fandomOptions = [
  { id: 'f1', type: 'fandom', value: 'Harry Potter', label: 'Harry Potter', fandoms: [] as string[], isDefault: false, createdAt: '' },
  { id: 'f2', type: 'fandom', value: 'Star Wars', label: 'Star Wars', fandoms: [] as string[], isDefault: false, createdAt: '' },
]

function Wrapper({ initial = [] as string[] }) {
  const [value, setValue] = useState(initial)
  return (
    <Autocomplete
      optionType="fandom"
      value={value}
      onChange={setValue}
      placeholder="Elige un fandom"
    />
  )
}

describe('Autocomplete', () => {
  let state: { options: Record<string, typeof fandomOptions>; loading: object; loadOptions: ReturnType<typeof vi.fn>; addOption: ReturnType<typeof vi.fn>; removeOption: ReturnType<typeof vi.fn>; getOptions: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    state = {
      options: { fandom: fandomOptions },
      loading: {},
      loadOptions: vi.fn(),
      addOption: vi.fn().mockImplementation(async (type: string, value: string, label: string) => {
        const opt = { id: 'f3', type, value, label, fandoms: [] as string[], isDefault: false, createdAt: '' }
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

  it('muestra sugerencias filtradas al escribir', () => {
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Elige un fandom')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'harry' } })

    expect(screen.getByText('Harry Potter')).toBeInTheDocument()
    expect(screen.queryByText('Star Wars')).not.toBeInTheDocument()
  })

  it('selecciona una sugerencia con Enter tras navegar con ArrowDown', () => {
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Elige un fandom')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Harry Potter')).toBeInTheDocument()
  })

  it('crea y selecciona una opción nueva al pulsar Enter', async () => {
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Elige un fandom')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Nuevo Fandom' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(state.addOption).toHaveBeenCalledWith('fandom', 'Nuevo Fandom', 'Nuevo Fandom', [])
    })
    await vi.waitFor(() => {
      expect(screen.getByText('Nuevo Fandom')).toBeInTheDocument()
    })
  })

  it('no crea si la opción ya existe (reusa el valor guardado)', async () => {
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Elige un fandom')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'harry potter' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(state.addOption).not.toHaveBeenCalled()
    })
    expect(screen.getByText('Harry Potter')).toBeInTheDocument()
  })

  it('quita chips con el botón remove', () => {
    render(<Wrapper initial={['Harry Potter']} />)
    fireEvent.click(screen.getByRole('button', { name: 'common.remove' }))
    expect(screen.queryByText('Harry Potter')).not.toBeInTheDocument()
  })

  it('filtra ships por los fandoms seleccionados (cache por fandom)', () => {
    state.options = {
      'ship::Harry Potter': [
        { id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione', fandoms: ['Harry Potter'], isDefault: false, createdAt: '' },
        { id: 's2', type: 'ship', value: 'Ronmione', label: 'Ronmione', fandoms: ['Harry Potter'], isDefault: false, createdAt: '' },
      ],
    }

    render(
      <Autocomplete
        optionType="ship"
        value={[]}
        onChange={vi.fn()}
        placeholder="ships"
        fandoms={['Harry Potter']}
      />,
    )
    const input = screen.getByPlaceholderText('ships')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'dra' } })

    expect(screen.getByText('Dramione')).toBeInTheDocument()
    expect(screen.queryByText('Ronmione')).not.toBeInTheDocument()
  })

  it('al crear un ship nuevo con fandoms seleccionados pregunta a cuál pertenece', async () => {
    state.options = { 'ship::Harry Potter|Star Wars': [] }

    render(
      <Autocomplete
        optionType="ship"
        value={[]}
        onChange={vi.fn()}
        placeholder="ships"
        fandoms={['Harry Potter', 'Star Wars']}
      />,
    )
    const input = screen.getByPlaceholderText('ships')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Dramione' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText(/storySetup.fandomBelongsTo/)).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'common.confirm' })
    await waitFor(() => {
      expect(confirm).toBeEnabled()
    })
    fireEvent.click(confirm)

    await vi.waitFor(() => {
      expect(state.addOption).toHaveBeenCalledWith('ship', 'Dramione', 'Dramione', ['Harry Potter', 'Star Wars'])
    })
  })
})
