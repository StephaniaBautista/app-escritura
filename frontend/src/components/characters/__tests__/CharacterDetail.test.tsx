import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CharacterDetail } from '../CharacterDetail'
import type { Character } from '@/types/character'

const mocks = vi.hoisted(() => ({
  setEvolutionReason: vi.fn(),
  removeRelation: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: mocks.toastError, success: mocks.toastSuccess }),
}))

vi.mock('@/stores/characters-store', () => ({
  useCharactersStore: (selector?: (s: unknown) => unknown) => {
    const state = { setEvolutionReason: mocks.setEvolutionReason }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/relationships-store', () => ({
  useRelationshipsStore: (selector?: (s: unknown) => unknown) => {
    const state = { remove: mocks.removeRelation }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/character-options-store', () => ({
  useCharacterOptionsStore: () => ({ load: () => Promise.resolve(), getOptions: () => [] }),
}))

vi.mock('../CharacterSheet', () => ({
  CharacterSheet: () => <div data-testid="character-sheet" />,
}))

vi.mock('../FamilyTree', () => ({
  FamilyTree: () => <div data-testid="family-tree" />,
}))

vi.mock('../CharacterEvolutionSection', () => ({
  CharacterEvolutionSection: () => <div data-testid="evolution-section" />,
}))

const baseCharacter: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra Belacqua',
  description: null,
  imageUrl: null,
  sheetBackgroundMode: 'default',
  sheetBackgroundImages: [],
  nicknames: [],
  age: null,
  gender: null,
  heightCm: null,
  orientation: null,
  maritalStatus: null,
  species: null,
  birthPlace: null,
  birthDate: null,
  role: null,
  roleSpec: null,
  isOC: false,
  parentIds: [],
  evolvesFromId: null,
  evolutionReason: null,
  storyPoint: 'inicio',
  attributes: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const renderDetail = (character: Character, props: Partial<React.ComponentProps<typeof CharacterDetail>> = {}) => {
  const onSelect = vi.fn()
  render(
    <CharacterDetail
      character={character}
      characters={[character]}
      onClose={vi.fn()}
      onEdit={vi.fn()}
      onEvolve={vi.fn()}
      evolving={false}
      onCancelEvolve={vi.fn()}
      onEvolved={vi.fn()}
      onSelect={onSelect}
      onDelete={vi.fn()}
      {...props}
    />,
  )
  return { onSelect }
}

describe('CharacterDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no muestra el botón Volver en un personaje original', () => {
    renderDetail(baseCharacter)

    expect(screen.queryByText('common.back')).not.toBeInTheDocument()
  })

  it('muestra el botón Volver en una evolución y navega al personaje origen', () => {
    const { onSelect } = renderDetail({ ...baseCharacter, id: 'char-2', evolvesFromId: 'char-1' })

    fireEvent.click(screen.getByText('common.back'))

    expect(onSelect).toHaveBeenCalledWith('char-1')
  })

  it('oculta el botón Volver mientras se está evolucionando', () => {
    renderDetail(
      { ...baseCharacter, id: 'char-2', evolvesFromId: 'char-1' },
      { evolving: true },
    )

    expect(screen.queryByText('common.back')).not.toBeInTheDocument()
  })

  it('lista las evoluciones derivadas de la cadena y navega al hacer click', () => {
    const original = baseCharacter
    const evolved = { ...baseCharacter, id: 'char-2', name: 'Lyra la Dama', evolvesFromId: 'char-1' }
    const { onSelect } = renderDetail(original, { characters: [original, evolved] })

    expect(screen.getByText('characterApp.evolutions')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Lyra la Dama'))

    expect(onSelect).toHaveBeenCalledWith('char-2')
  })
})
