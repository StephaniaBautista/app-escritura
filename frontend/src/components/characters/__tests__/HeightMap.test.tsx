import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { HeightMap } from '../HeightMap'
import type { Character } from '@/types/character'

function makeCharacter(overrides: Partial<Character>): Character {
  return {
    id: 'c-1',
    projectId: 'proj-1',
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
    ...overrides,
  }
}

function renderMap(characters: Character[], onClose = vi.fn()) {
  return render(
    <I18nextProvider i18n={i18n}>
      <HeightMap characters={characters} onClose={onClose} />
    </I18nextProvider>,
  )
}

describe('HeightMap', () => {
  it('muestra el mensaje vacío si nadie tiene altura', () => {
    renderMap([makeCharacter({})])
    expect(screen.getByText((content) => content.includes('heightMapEmpty'))).toBeTruthy()
  })

  it('ordena los personajes de menor a mayor altura y deja los sin altura al final', () => {
    const characters = [
      makeCharacter({ id: 'tall', name: 'Tall', heightCm: 200 }),
      makeCharacter({ id: 'noheight', name: 'NoHeight', heightCm: null }),
      makeCharacter({ id: 'short', name: 'Short', heightCm: 140 }),
    ]
    renderMap(characters)
    const figures = screen.getAllByRole('figure')
    expect(figures.map((f) => f.getAttribute('title'))).toEqual(['Short', 'Tall', 'NoHeight'])
  })

  it('muestra la altura en cm de cada personaje', () => {
    renderMap([makeCharacter({ id: 'a', name: 'A', heightCm: 165 })])
    expect(screen.getByText('165 cm')).toBeTruthy()
  })

  it('llama a onClose al pulsar el botón de cerrar', () => {
    const onClose = vi.fn()
    renderMap([makeCharacter({ id: 'a', name: 'A', heightCm: 165 })], onClose)
    fireEvent.click(screen.getByTestId('height-map-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
