import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterForm } from '../CharacterForm'
import type { Character } from '@/types/character'
import { getTestOptions } from './character-options-test-data'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  uploadImage: vi.fn(),
  syncBackgroundImages: vi.fn(),
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
    create: mocks.create,
    update: mocks.update,
    uploadImage: mocks.uploadImage,
    syncBackgroundImages: mocks.syncBackgroundImages,
  }),
}))

vi.mock('@/stores/character-options-store', () => ({
  useCharacterOptionsStore: (selector: (s: unknown) => unknown) =>
    selector({
      load: () => Promise.resolve(),
      getOptions: getTestOptions,
    }),
}))

const savedCharacter: Character = {
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
  storyPoint: null,
  attributes: { motivations: 'Encontrar a su padre' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('CharacterForm', () => {
  const renderForm = (props: Partial<React.ComponentProps<typeof CharacterForm>> = {}) => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(
      <CharacterForm
        projectId="project-1"
        allCharacters={[]}
        character={null}
        onClose={onClose}
        onSaved={onSaved}
        {...props}
      />,
    )
    return { onClose, onSaved }
  }

  it('renderiza la estructura de ficha con hero, secciones y campos accesibles', () => {
    renderForm()

    expect(screen.getByText('characterApp.sheetLabel')).toBeInTheDocument()
    expect(screen.getByText('characterApp.newCharacter')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetBasicHeading')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetFactsHeading')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetPhysical')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetEmotional')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetLifestyle')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldName')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldNicknames')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldAge')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldGender')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldRole', { exact: true })).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.storyPoint')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.attr_personality')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.attr_extraData')).toBeInTheDocument()
  })

  it('agrupa los atributos en sus secciones de ficha', () => {
    renderForm()

    const physical = screen.getByText('characterApp.sheetPhysical').closest('section')
    expect(physical).toBeTruthy()
    expect(physical).toHaveTextContent('characterApp.attr_jobStudies')
    expect(physical).toHaveTextContent('characterApp.attr_clothing')
    expect(physical).not.toHaveTextContent('characterApp.attr_personality')

    const emotional = screen.getByText('characterApp.sheetEmotional').closest('section')
    expect(emotional).toBeTruthy()
    expect(emotional).toHaveTextContent('characterApp.attr_internalConflict')
  })

  it('muestra las opciones del catálogo servidas por la API (género y rol)', () => {
    renderForm()

    const gender = screen.getByLabelText('characterApp.fieldGender') as HTMLSelectElement
    const genderLabels = Array.from(gender.options).map((o) => o.textContent)
    expect(genderLabels).toContain('Femenino')
    expect(genderLabels).toContain('Masculino')

    const role = screen.getByLabelText('characterApp.fieldRole') as HTMLSelectElement
    const roleLabels = Array.from(role.options).map((o) => o.textContent)
    expect(roleLabels).toContain('Principal')
    expect(roleLabels).toContain('Secundario')
  })

  it('no guarda sin nombre y muestra el error', () => {
    const { onSaved } = renderForm()

    fireEvent.click(screen.getByText('characterApp.save'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.errorName')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('guarda con nombre y cierra el formulario', async () => {
    mocks.create.mockResolvedValue(savedCharacter)
    const { onClose, onSaved } = renderForm()

    fireEvent.change(screen.getByLabelText('characterApp.fieldName'), { target: { value: 'Lyra Belacqua' } })
    fireEvent.change(screen.getByLabelText('characterApp.attr_motivations'), { target: { value: 'Encontrar a su padre' } })
    fireEvent.click(screen.getByText('characterApp.save'))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('project-1', expect.objectContaining({
        name: 'Lyra Belacqua',
        attributes: { motivations: 'Encontrar a su padre' },
      }))
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('characterApp.saved')
    expect(onSaved).toHaveBeenCalledWith(savedCharacter)
    expect(onClose).toHaveBeenCalled()
  })

  it('en modo edición muestra el nombre del personaje en el hero', () => {
    renderForm({ character: savedCharacter })

    expect(screen.getByText('Lyra Belacqua')).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldName')).toHaveValue('Lyra Belacqua')
  })

  it('permite añadir una opción custom con el botón + y guardarla', () => {
    renderForm()

    fireEvent.change(screen.getByLabelText('characterApp.fieldName'), { target: { value: 'Lyra Belacqua' } })
    fireEvent.click(screen.getAllByLabelText('characterApp.customOption')[0])
    fireEvent.change(screen.getByPlaceholderText('characterApp.customAddPlaceholder'), { target: { value: 'No binario fluido' } })
    fireEvent.click(screen.getByLabelText('characterApp.customAddConfirm'))

    expect(screen.getByRole('option', { name: 'No binario fluido' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('characterApp.save'))
    expect(mocks.create).toHaveBeenCalledWith('project-1', expect.objectContaining({ gender: 'No binario fluido' }))
  })

  it('un valor custom guardado aparece como opción seleccionada al editar', () => {
    renderForm({ character: { ...savedCharacter, gender: 'No binario fluido' } })

    expect(screen.getByRole('option', { name: 'No binario fluido' })).toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldGender')).toHaveValue('No binario fluido')
  })

  it('distingue entre personaje ficticio y OC con un control de dos opciones', () => {
    renderForm()

    const group = screen.getByRole('radiogroup', { name: 'characterApp.fieldIsOC' })
    expect(group).toBeInTheDocument()

    const fictional = screen.getByRole('radio', { name: 'characterApp.characterTypeFictional' })
    const oc = screen.getByRole('radio', { name: 'characterApp.ocBadge' })
    expect(fictional).toBeChecked()
    expect(oc).not.toBeChecked()

    fireEvent.change(screen.getByLabelText('characterApp.fieldName'), { target: { value: 'Lyra Belacqua' } })
    fireEvent.click(oc)

    expect(oc).toBeChecked()
    expect(fictional).not.toBeChecked()

    fireEvent.click(screen.getByText('characterApp.save'))
    expect(mocks.create).toHaveBeenCalledWith('project-1', expect.objectContaining({ isOC: true }))
  })

  it('los grupos de atributos vacíos empiezan colapsados como acordeones', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'characterApp.sheetPhysical' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'characterApp.sheetEmotional' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'characterApp.sheetLifestyle' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'characterApp.sheetFactsHeading' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('los grupos de atributos con contenido abren al editar', () => {
    renderForm({ character: { ...savedCharacter, attributes: { jobStudies: 'Caballera' } } })

    expect(screen.getByRole('button', { name: 'characterApp.sheetPhysical' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'characterApp.sheetEmotional' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('oculta la sección de familia sin otros personajes y muestra la sugerencia', () => {
    renderForm()

    expect(screen.getByText('characterApp.familySuggestCreate')).toBeInTheDocument()
    expect(screen.queryByLabelText('characterApp.fieldChildren')).not.toBeInTheDocument()
  })

  it('muestra la sección de familia cuando hay otros personajes', () => {
    renderForm({ allCharacters: [{ ...savedCharacter, id: 'char-2', name: 'Robb Stark' }] })

    expect(screen.queryByText('characterApp.familySuggestCreate')).not.toBeInTheDocument()
    expect(screen.getByLabelText('characterApp.fieldChildren')).toBeInTheDocument()
  })

  it('sugiere especies y lugares de nacimiento ya usados en el proyecto', () => {
    renderForm({
      allCharacters: [{ ...savedCharacter, id: 'char-2', name: 'Robb Stark', species: 'Humano', birthPlace: 'Invernalia' }],
    })

    const species = screen.getByLabelText('characterApp.fieldSpecies') as HTMLInputElement
    const speciesList = document.getElementById(species.getAttribute('list') ?? '')
    const speciesValues = Array.from(speciesList?.querySelectorAll('option') ?? []).map((o) => o.getAttribute('value'))
    expect(speciesValues).toContain('Humano')

    const birthPlace = screen.getByLabelText('characterApp.fieldBirthPlace') as HTMLInputElement
    const birthPlaceList = document.getElementById(birthPlace.getAttribute('list') ?? '')
    const birthPlaceValues = Array.from(birthPlaceList?.querySelectorAll('option') ?? []).map((o) => o.getAttribute('value'))
    expect(birthPlaceValues).toContain('Invernalia')
  })

  it('muestra preguntas guía como placeholder en los atributos', () => {
    renderForm()

    expect(screen.getByLabelText('characterApp.attr_motivations'))
      .toHaveAttribute('placeholder', 'characterApp.attr_motivations_placeholder')
    expect(screen.getByLabelText('characterApp.attr_health'))
      .toHaveAttribute('placeholder', 'characterApp.attr_health_placeholder')
    expect(screen.getByLabelText('characterApp.attr_extraData'))
      .toHaveAttribute('placeholder', 'characterApp.attr_extraData_placeholder')
  })

  it('muestra spinner y "Guardando..." mientras guarda, y no cierra hasta terminar', async () => {
    let resolveCreate!: (c: Character) => void
    mocks.create.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    const { onClose } = renderForm()

    fireEvent.change(screen.getByLabelText('characterApp.fieldName'), { target: { value: 'Lyra Belacqua' } })
    fireEvent.click(screen.getByText('characterApp.save'))

    expect(screen.getByTestId('character-save-spinner')).toBeInTheDocument()
    expect(screen.getByText('common.saving')).toBeInTheDocument()
    expect(screen.getByText('common.saving').closest('button')).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    resolveCreate(savedCharacter)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})
