import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CharacterRelations } from '../CharacterRelations'
import type { Character } from '@/types/character'
import type { CharacterRelationship } from '@/types/relationship'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const lyra: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra',
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
  storyPoint: null,
  attributes: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const will: Character = { ...lyra, id: 'char-2', name: 'Will' }
const serafina: Character = { ...lyra, id: 'char-3', name: 'Serafina' }

function makeRelation(type: CharacterRelationship['type'], label: string | null, otherId: string): CharacterRelationship {
  return {
    id: `rel-${type}`,
    projectId: 'project-1',
    characterAId: 'char-1',
    characterBId: otherId,
    type,
    label,
    description: null,
    characterA: { id: 'char-1', name: 'Lyra', imageUrl: null, heightCm: null },
    characterB: { id: otherId, name: otherId === 'char-2' ? 'Will' : 'Serafina', imageUrl: null, heightCm: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('CharacterRelations', () => {
  it('no renderiza nada sin familia ni relaciones', () => {
    const { container } = render(
      <CharacterRelations character={lyra} characters={[]} relations={[]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('muestra padres e hijos derivados de parentIds', () => {
    const parent: Character = { ...lyra, id: 'char-4', name: 'Elaine' }
    render(
      <CharacterRelations
        character={{ ...lyra, parentIds: ['char-4'] }}
        characters={[parent, { ...lyra, id: 'char-5', name: 'Pan', parentIds: ['char-1'] }]}
        relations={[]}
      />,
    )

    expect(screen.getByText('Elaine')).toBeInTheDocument()
    expect(screen.getByText('Pan')).toBeInTheDocument()
    expect(screen.getAllByText('characterApp.parents').length).toBeGreaterThan(0)
    expect(screen.getAllByText('characterApp.children').length).toBeGreaterThan(0)
  })

  it('muestra las relaciones por tipo con su etiqueta', () => {
    render(
      <CharacterRelations
        character={lyra}
        characters={[will, serafina]}
        relations={[
          makeRelation('romance', null, 'char-2'),
          makeRelation('family', 'Hermano', 'char-3'),
        ]}
      />,
    )

    expect(screen.getByText('Will')).toBeInTheDocument()
    expect(screen.getAllByText('characterApp.relType_romance').length).toBeGreaterThan(0)
    expect(screen.getByText('Serafina')).toBeInTheDocument()
    expect(screen.getByText('Hermano')).toBeInTheDocument()
    expect(screen.getByText('characterApp.relType_family')).toBeInTheDocument()
  })

  it('navega al personaje contrario al hacer clic', () => {
    const onSelect = vi.fn()
    render(
      <CharacterRelations
        character={lyra}
        characters={[will]}
        relations={[makeRelation('friendship', null, 'char-2')]}
        onSelectCharacter={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Will' }))
    expect(onSelect).toHaveBeenCalledWith('char-2')
  })

  it('permite quitar una relación con su botón', () => {
    const onRemove = vi.fn()
    const relation = makeRelation('enemity', null, 'char-2')
    render(
      <CharacterRelations
        character={lyra}
        characters={[will]}
        relations={[relation]}
        onRemoveRelation={onRemove}
      />,
    )

    fireEvent.click(screen.getByLabelText('characterApp.relRemove'))
    expect(onRemove).toHaveBeenCalledWith(relation)
  })

  it('muestra el botón de añadir cuando hay callback', () => {
    const onAdd = vi.fn()
    render(
      <CharacterRelations
        character={lyra}
        characters={[will]}
        relations={[]}
        onAddRelation={onAdd}
      />,
    )

    fireEvent.click(screen.getByText('characterApp.relAdd'))
    expect(onAdd).toHaveBeenCalled()
  })
})
