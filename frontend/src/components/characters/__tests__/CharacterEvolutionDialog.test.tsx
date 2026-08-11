import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterEvolutionDialog } from '../CharacterEvolutionDialog'
import type { Character } from '@/types/character'
import { getTestOptions } from './character-options-test-data'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  evolve: vi.fn(),
  uploadImage: vi.fn(),
  syncBackgroundImages: vi.fn(),
  update: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: mocks.toastError, success: mocks.toastSuccess }),
}))

vi.mock('@/stores/characters-store', () => ({
  useCharactersStore: () => ({
    characters: [],
    evolve: mocks.evolve,
    uploadImage: mocks.uploadImage,
    syncBackgroundImages: mocks.syncBackgroundImages,
    update: mocks.update,
  }),
}))

vi.mock('@/stores/character-options-store', () => ({
  useCharacterOptionsStore: (selector: (s: unknown) => unknown) =>
    selector({
      load: () => Promise.resolve(),
      getOptions: getTestOptions,
    }),
}))

const sourceCharacter: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra Belacqua',
  description: 'Una protagonista curiosa.',
  imageUrl: null,
  sheetBackgroundMode: 'default',
  sheetBackgroundImages: [],
  nicknames: ['Ly'],
  age: '17',
  gender: 'Femenino',
  heightCm: 165,
  orientation: null,
  maritalStatus: null,
  species: 'Humana',
  birthPlace: 'Oxford',
  birthDate: null,
  role: 'Principal',
  roleSpec: 'Protagonista',
  isOC: false,
  parentIds: [],
  evolvesFromId: null,
  evolutionReason: null,
  storyPoint: 'inicio',
  attributes: { personality: 'Curiosa' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('CharacterEvolutionDialog', () => {
  const renderDialog = (props: Partial<React.ComponentProps<typeof CharacterEvolutionDialog>> = {}) => {
    const onClose = vi.fn()
    const onEvolved = vi.fn()
    render(
      <CharacterEvolutionDialog
        character={sourceCharacter}
        allCharacters={[]}
        onClose={onClose}
        onEvolved={onEvolved}
        {...props}
      />,
    )
    return { onClose, onEvolved }
  }

  it('pre-rellena todos los datos del personaje y muestra su nombre', () => {
    renderDialog()

    expect(screen.getByText('Lyra Belacqua')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldName')).toHaveValue('Lyra Belacqua')
    expect(screen.getByLabelText('characterApp.fieldAge')).toHaveValue('17')
    expect(screen.getByLabelText('characterApp.fieldGender')).toHaveValue('Femenino')
    expect(screen.getByLabelText('characterApp.fieldSpecies')).toHaveValue('Humana')
    expect(screen.getByLabelText('characterApp.attr_personality')).toHaveValue('Curiosa')
  })

  it('ofrece solo puntos posteriores al del personaje original', () => {
    renderDialog()

    const select = screen.getByLabelText('characterApp.evolvePoint') as HTMLSelectElement
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.getAttribute('value'))
    expect(values).toContain('desarrollo')
    expect(values).toContain('climax')
    expect(values).toContain('final')
    expect(values).not.toContain('inicio')
  })

  it('no guarda sin motivo y muestra el error', async () => {
    const { onEvolved } = renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolveReasonRequired')
    expect(mocks.evolve).not.toHaveBeenCalled()
    expect(onEvolved).not.toHaveBeenCalled()
  })

  it('no guarda sin punto de la historia', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Se vuelve reservada' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolvePointRequired')
    expect(mocks.evolve).not.toHaveBeenCalled()
  })

  it('guarda con motivo, punto posterior y cambios de datos', async () => {
    mocks.evolve.mockResolvedValue({ ...sourceCharacter, id: 'char-2', name: 'Lyra la Dama', storyPoint: 'climax' })
    const { onClose, onEvolved } = renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.fieldName'), { target: { value: 'Lyra la Dama' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Tras el segundo libro se vuelve reservada' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    await waitFor(() => {
      expect(mocks.evolve).toHaveBeenCalledWith('char-1', 'Tras el segundo libro se vuelve reservada', expect.objectContaining({
        name: 'Lyra la Dama',
        storyPoint: 'climax',
        age: '17',
        attributes: { personality: 'Curiosa' },
      }))
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('characterApp.evolveSuccess')
    expect(onEvolved).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-2' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra spinner mientras guarda y bloquea los campos', async () => {
    let resolveEvolve!: (c: Character) => void
    mocks.evolve.mockImplementation(() => new Promise((resolve) => { resolveEvolve = resolve }))
    const { onClose, onEvolved } = renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(screen.getByTestId('character-evolve-spinner')).toBeInTheDocument()
    expect(screen.getByText('common.saving').closest('button')).toBeDisabled()
    expect(screen.getByLabelText('characterApp.fieldName')).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    resolveEvolve({ ...sourceCharacter, id: 'char-2' })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(onEvolved).toHaveBeenCalled()
    })
  })

  it('no guarda si el punto es inválido y muestra el error específico', async () => {
    mocks.evolve.mockRejectedValue(new Error('EVOLUTION_POINT_INVALID'))
    renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolvePointInvalid')
    })
  })
})
