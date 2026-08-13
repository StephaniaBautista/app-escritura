import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharactersPanel } from '../CharactersPanel'
import type { Character } from '@/types/character'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  loadRelations: vi.fn(),
  characters: [] as Character[],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

vi.mock('@/stores/characters-store', () => ({
  useCharactersStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      characters: mocks.characters ?? [],
      isLoading: false,
      load: mocks.load,
      remove: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/relationships-store', () => ({
  useRelationshipsStore: (selector?: (s: unknown) => unknown) => {
    const state = { relations: [], load: mocks.loadRelations, remove: vi.fn() }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/character-options-store', () => ({
  useCharacterOptionsStore: () => ({ load: () => Promise.resolve(), getOptions: () => [] }),
}))

const original: Character = {
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

const evolved: Character = {
  ...original,
  id: 'char-2',
  name: 'Lyra la Dama',
  evolvesFromId: 'char-1',
  evolutionReason: 'Tras el segundo libro',
  storyPoint: 'climax',
}

describe('CharactersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.characters = [original, evolved]
  })

  it('oculta los personajes evolucionados del listado', () => {
    render(<CharactersPanel projectId="project-1" />)

    expect(screen.getByText('Lyra Belacqua')).toBeInTheDocument()
    expect(screen.queryByText('Lyra la Dama')).not.toBeInTheDocument()
  })

  it('cuenta solo los personajes no evolucionados en el subtítulo', () => {
    render(<CharactersPanel projectId="project-1" />)

    expect(screen.getByText(/· 1$/)).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando solo hay evoluciones', () => {
    mocks.characters = [evolved]
    render(<CharactersPanel projectId="project-1" />)

    expect(screen.getByText('characterApp.empty')).toBeInTheDocument()
  })
})
