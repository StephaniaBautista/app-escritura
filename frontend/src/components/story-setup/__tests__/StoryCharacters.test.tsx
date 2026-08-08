import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryCharacters } from '../StoryCharacters'

const { optionsStoreMock, autocompleteMock } = vi.hoisted(() => ({
  optionsStoreMock: vi.fn(),
  autocompleteMock: vi.fn(),
}))

vi.mock('@/stores/options-store', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/stores/options-store')>()
  return { ...mod, useOptionsStore: optionsStoreMock }
})

vi.mock('../Autocomplete', () => ({
  Autocomplete: (props: { onChange: (names: string[]) => void; value: string[] }) => {
    autocompleteMock(props)
    return null
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const optionsState = {
  options: {},
  loading: {},
  loadOptions: vi.fn(),
  addOption: vi.fn(),
  removeOption: vi.fn(),
  getOptions: vi.fn().mockReturnValue([]),
}

describe('StoryCharacters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    optionsStoreMock.mockImplementation((selector?: (state: typeof optionsState) => unknown) => {
      if (typeof selector === 'function') return selector(optionsState)
      return optionsState
    })
  })

  it('modo libre: solo muestra nombre y toggle OC por personaje', () => {
    render(
      <StoryCharacters
        meta={{
          guidedMode: false,
          characters: [
            { name: 'Aria', isOC: true },
            { name: 'Kael', isOC: false },
          ],
        }}
        update={vi.fn()}
      />,
    )

    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('Kael')).toBeInTheDocument()
    expect(screen.getAllByText('storySetup.oc')).toHaveLength(1)
    expect(screen.queryByText('storySetup.guidedMentalState')).not.toBeInTheDocument()
  })

  it('modo guiado: muestra campos de estado mental y físico por personaje', () => {
    render(
      <StoryCharacters
        meta={{
          guidedMode: true,
          characters: [
            { name: 'Aria', isOC: false, initialState: 'Ansiosa', initialPhysicalState: 'Herida' },
          ],
        }}
        update={vi.fn()}
      />,
    )

    expect(screen.getAllByText('storySetup.guidedMentalState')).toHaveLength(1)
    expect(screen.getAllByText('storySetup.guidedPhysicalState')).toHaveLength(1)
    expect(screen.getByDisplayValue('Ansiosa')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Herida')).toBeInTheDocument()
  })

  it('guarda los estados del personaje al escribir', () => {
    const update = vi.fn()
    render(
      <StoryCharacters
        meta={{ guidedMode: true, characters: [{ name: 'Aria', isOC: false }] }}
        update={update}
      />,
    )

    fireEvent.change(screen.getByLabelText('storySetup.guidedMentalState'), { target: { value: 'Tranquila' } })
    expect(update).toHaveBeenCalledWith({
      characters: [{ name: 'Aria', isOC: false, initialState: 'Tranquila' }],
    })
  })
})
