import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharacterSheet } from '../CharacterSheet'
import type { Character } from '@/types/character'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const character: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra Belacqua',
  description: 'Una protagonista curiosa y valiente.',
  imageUrl: 'https://cdn.example.com/portrait.jpg',
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
  attributes: {
    motivations: 'Encontrar a su padre',
    personality: 'Curiosa y valiente',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('CharacterSheet', () => {
  it('renderiza una ficha editorial con fondo predeterminado', () => {
    render(<CharacterSheet character={character} />)

    expect(screen.getByTestId('character-sheet')).toBeInTheDocument()
    expect(screen.getByText('Lyra Belacqua')).toBeInTheDocument()
    expect(screen.getByText('Encontrar a su padre')).toBeInTheDocument()
    expect(screen.getByTestId('character-sheet-hero')).toHaveClass('character-sheet__hero--default')
  })

  it('renderiza todas las imágenes configuradas para un collage', () => {
    render(
      <CharacterSheet
        character={{
          ...character,
          sheetBackgroundMode: 'collage',
          sheetBackgroundImages: [
            'https://cdn.example.com/one.jpg',
            'https://cdn.example.com/two.jpg',
          ],
        }}
      />,
    )

    expect(screen.getByTestId('character-sheet-hero')).toHaveClass('character-sheet__hero--collage')
    expect(screen.getByTestId('character-sheet-hero').querySelectorAll('img')).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'characterApp.sheetPortraitAlt' })).toBeInTheDocument()
  })
})
