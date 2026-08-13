import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterEvolutionSection } from '../CharacterEvolutionSection'
import type { Character } from '@/types/character'
import { getTestOptions } from './character-options-test-data'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  evolve: vi.fn(),
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
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
    deleteImage: mocks.deleteImage,
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

describe('CharacterEvolutionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderSection = (props: Partial<React.ComponentProps<typeof CharacterEvolutionSection>> = {}) => {
    const onCancel = vi.fn()
    const onEvolved = vi.fn()
    render(
      <CharacterEvolutionSection
        character={sourceCharacter}
        allCharacters={[]}
        onCancel={onCancel}
        onEvolved={onEvolved}
        {...props}
      />,
    )
    return { onCancel, onEvolved }
  }

  it('pre-rellena los datos del personaje actual y muestra la imagen anterior', () => {
    renderSection({ character: { ...sourceCharacter, imageUrl: 'https://img/old.jpg' } })

    expect(screen.getByText('Lyra Belacqua')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldName')).toHaveValue('Lyra Belacqua')
    expect(screen.getByLabelText('characterApp.fieldAge')).toHaveValue('17')
    expect(screen.getByLabelText('characterApp.fieldSpecies')).toHaveValue('Humana')
    expect(screen.getByLabelText('characterApp.attr_personality')).toHaveValue('Curiosa')
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://img/old.jpg')
    expect(screen.getByLabelText('characterApp.evolvePoint')).toHaveValue('')
    expect(screen.getByLabelText('characterApp.evolveReason')).toHaveValue('')
  })

  it('ofrece solo puntos posteriores al del personaje original', () => {
    renderSection()

    const select = screen.getByLabelText('characterApp.evolvePoint') as HTMLSelectElement
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.getAttribute('value'))
    expect(values).toContain('desarrollo')
    expect(values).toContain('climax')
    expect(values).toContain('final')
    expect(values).not.toContain('inicio')
  })

  it('no guarda sin motivo y muestra el error', async () => {
    const { onEvolved } = renderSection()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolveReasonRequired')
    expect(mocks.evolve).not.toHaveBeenCalled()
    expect(onEvolved).not.toHaveBeenCalled()
  })

  it('no guarda sin punto de la historia', async () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Se vuelve reservada' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolvePointRequired')
    expect(mocks.evolve).not.toHaveBeenCalled()
  })

  it('guarda con motivo, punto posterior y cambios de datos', async () => {
    mocks.evolve.mockResolvedValue({ ...sourceCharacter, id: 'char-2', name: 'Lyra la Dama', storyPoint: 'climax' })
    const { onEvolved } = renderSection()

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
  })

  it('permite eliminar la imagen anterior y la aplica a la evolución', async () => {
    mocks.evolve.mockResolvedValue({ ...sourceCharacter, id: 'char-2' })
    const { onEvolved } = renderSection({ character: { ...sourceCharacter, imageUrl: 'https://img/old.jpg' } })

    fireEvent.click(screen.getByText('characterApp.imageRemove'))
    expect(document.querySelector('img')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    await waitFor(() => {
      expect(mocks.evolve).toHaveBeenCalled()
      expect(mocks.deleteImage).toHaveBeenCalledWith('char-2')
    })
    expect(mocks.uploadImage).not.toHaveBeenCalled()
    expect(onEvolved).toHaveBeenCalled()
  })

  it('sube una imagen nueva a la evolución', async () => {
    mocks.evolve.mockResolvedValue({ ...sourceCharacter, id: 'char-2' })
    renderSection()

    const file = new File(['x'], 'img.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    await waitFor(() => {
      expect(document.querySelector('img')).toHaveAttribute('src', expect.stringContaining('data:image/png'))
    })

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    await waitFor(() => {
      expect(mocks.uploadImage).toHaveBeenCalledWith('char-2', expect.stringContaining('data:image/png'))
    })
    expect(mocks.deleteImage).not.toHaveBeenCalled()
  })

  it('muestra spinner mientras guarda y bloquea los campos', async () => {
    let resolveEvolve!: (c: Character) => void
    mocks.evolve.mockImplementation(() => new Promise((resolve) => { resolveEvolve = resolve }))
    const { onEvolved } = renderSection()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    expect(screen.getByTestId('character-evolve-spinner')).toBeInTheDocument()
    expect(screen.getByText('common.saving').closest('button')).toBeDisabled()
    expect(screen.getByLabelText('characterApp.fieldName')).toBeDisabled()

    resolveEvolve({ ...sourceCharacter, id: 'char-2' })

    await waitFor(() => {
      expect(onEvolved).toHaveBeenCalled()
    })
  })

  it('no guarda si el punto es inválido y muestra el error específico', async () => {
    mocks.evolve.mockRejectedValue(new Error('EVOLUTION_POINT_INVALID'))
    renderSection()

    fireEvent.change(screen.getByLabelText('characterApp.evolvePoint'), { target: { value: 'climax' } })
    fireEvent.change(screen.getByLabelText('characterApp.evolveReason'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByText('characterApp.evolve'))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('characterApp.evolvePointInvalid')
    })
  })
})
