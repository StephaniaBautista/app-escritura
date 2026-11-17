import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EventDialog } from '../EventDialog'
import type { Character } from '@/types/character'
import { DEFAULT_TIMELINE_CONFIG } from '@/types/timeline'

const lyra: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra',
  description: null,
  imageUrl: null,
  heightMapImageUrl: null,
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
  ...lyra,
  id: 'char-2',
  name: 'Lyra',
  evolvesFromId: 'char-1',
  storyPoint: 'climax',
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: vi.fn(), success: vi.fn() }),
}))

vi.mock('@/stores/characters-store', () => ({
  useCharactersStore: () => ({
    characters: [lyra, evolved],
    isLoading: false,
    load: vi.fn(),
  }),
}))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: () => ({
    documentTree: [],
    loadDocumentTree: () => Promise.resolve(),
  }),
}))

describe('EventDialog related characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista las evoluciones como personajes independientes', () => {
    render(
      <EventDialog
        isOpen
        projectId="project-1"
        event={null}
        events={[]}
        eras={[]}
        timelineConfig={DEFAULT_TIMELINE_CONFIG}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.selectRelatedChars' }))

    expect(screen.getByRole('button', { name: /characterApp.relVersionOriginal/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /characterApp.relEvolutionOf/ })).toBeDisabled()
    expect(screen.getByText('timelineApp.evolutionNeedsOriginal')).toBeInTheDocument()
  })

  it('permite la evolución cuando el original aparece antes', () => {
    render(
      <EventDialog
        isOpen
        projectId="project-1"
        event={null}
        events={[{
          id: 'ev-prev',
          projectId: 'project-1',
          title: 'Inicio',
          date: '-1',
          description: null,
          order: 0,
          eraId: null,
          characterIds: ['char-1'],
          icon: null,
          color: null,
          groupName: null,
          precision: 'year',
          endDate: null,
          label: null,
          labelColor: null,
          imageUrl: null,
          relatedEventIds: [],
          relatedDocumentIds: [],
          subplotId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }]}
        eras={[]}
        timelineConfig={DEFAULT_TIMELINE_CONFIG}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.selectRelatedChars' }))
    expect(screen.getByRole('button', { name: /characterApp.relEvolutionOf/ })).toBeEnabled()
  })
})
