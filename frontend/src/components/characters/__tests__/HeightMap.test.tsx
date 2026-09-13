import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { HeightMap } from '../HeightMap'
import type { Character } from '@/types/character'

const mocks = vi.hoisted(() => ({
  uploadHeightMapImage: vi.fn(),
  deleteHeightMapImage: vi.fn(),
}))

vi.mock('@/stores/characters-store', () => ({
  useCharactersStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      uploadHeightMapImage: mocks.uploadHeightMapImage,
      deleteHeightMapImage: mocks.deleteHeightMapImage,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: vi.fn(), success: vi.fn() }),
}))

const CM_TO_PX = 2.4
const LABEL_SPACE = 26 * 3 + 10

function makeCharacter(overrides: Partial<Character>): Character {
  return {
    id: 'c-1',
    projectId: 'proj-1',
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

function stageHeightFor(topCm: number): string {
  return `${Math.round(topCm * CM_TO_PX)}px`
}

function chartHeightFor(topCm: number): string {
  return `${Math.round(topCm * CM_TO_PX) + LABEL_SPACE}px`
}

describe('HeightMap', () => {
  it('muestra el mensaje vacío si nadie tiene altura', () => {
    renderMap([makeCharacter({})])
    expect(screen.getByText((content) => content.includes('heightMapEmpty') || content.includes('Sin alturas'))).toBeTruthy()
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

  it('situó la etiqueta sobre la cabeza y el pie alineado con la escala', () => {
    renderMap([
      makeCharacter({ id: 'short', name: 'Short', heightCm: 164 }),
      makeCharacter({ id: 'tall', name: 'Tall', heightCm: 180 }),
    ])

    const shortStage = screen.getByTestId('height-map-stage-short')
    const tallStage = screen.getByTestId('height-map-stage-tall')
    const ruler = screen.getByTestId('height-map-ruler')

    expect(shortStage).toHaveStyle({ height: stageHeightFor(180) })
    expect(tallStage).toHaveStyle({ height: stageHeightFor(180) })
    expect(ruler).toHaveStyle({ height: chartHeightFor(180) })
    expect(ruler).toHaveTextContent('180')

    const shortSil = shortStage.querySelector('[data-testid="gender-silhouette"]') as HTMLElement
    expect(shortSil).toBeTruthy()
    expect(shortSil).toHaveStyle({ height: `${Math.round(164 * CM_TO_PX)}px` })
    expect(shortStage).toHaveTextContent('164 cm')
    expect(shortStage).toHaveTextContent('Short')
  })

  it('no muestra líneas por encima de la persona más alta', () => {
    renderMap([makeCharacter({ id: 'a', name: 'A', heightCm: 164 })])

    const ruler = screen.getByTestId('height-map-ruler')

    expect(ruler).toHaveStyle({ height: chartHeightFor(170) })
    expect(ruler).toHaveTextContent('160')
    expect(ruler).toHaveTextContent('140')
    expect(ruler).toHaveTextContent('120')
    expect(ruler).toHaveTextContent('100')
    expect(ruler).toHaveTextContent('20')
    expect(ruler).not.toHaveTextContent('180')
  })

  it('mantiene la marca de un personaje muy bajo', () => {
    renderMap([makeCharacter({ id: 'tiny', name: 'Tiny', heightCm: 20 })])

    const ruler = screen.getByTestId('height-map-ruler')

    expect(ruler).toHaveStyle({ height: chartHeightFor(20) })
    expect(ruler).toHaveTextContent('20')
    expect(ruler).not.toHaveTextContent('40')
  })

  it('no usa la foto de perfil del personaje; solo heightMapImageUrl', () => {
    renderMap([makeCharacter({ id: 'img', name: 'Img', heightCm: 170, imageUrl: 'https://example.com/face.png' })])
    const stage = screen.getByTestId('height-map-stage-img')
    expect(stage.querySelector('img[src*="example.com/face"]')).toBeNull()
    expect(stage.querySelector('[data-testid="gender-silhouette"]')).toBeTruthy()
  })

  it('muestra la foto de cuerpo completo a la altura de la escala', () => {
    renderMap([makeCharacter({ id: 'img', name: 'Img', heightCm: 170, heightMapImageUrl: 'https://example.com/full.png' })])
    const img = screen.getByTestId('height-map-photo')
    expect(img).toBeTruthy()
    expect(img).toHaveAttribute('src', 'https://example.com/full.png')
    expect(img).toHaveStyle({ height: `${Math.round(170 * CM_TO_PX)}px` })
  })

  it('elige silueta femenina o masculina según el género', () => {
    renderMap([
      makeCharacter({ id: 'f', name: 'F', heightCm: 160, gender: 'Femenino' }),
      makeCharacter({ id: 'm', name: 'M', heightCm: 180, gender: 'Masculino' }),
    ])
    const femaleSil = screen.getByTestId('height-map-stage-f').querySelector('[data-testid="gender-silhouette"]')
    const maleSil = screen.getByTestId('height-map-stage-m').querySelector('[data-testid="gender-silhouette"]')
    expect(femaleSil).toHaveAttribute('data-gender', 'female')
    expect(maleSil).toHaveAttribute('data-gender', 'male')
    expect(femaleSil).toHaveAttribute('src', '/silhouettes/female.png')
    expect(maleSil).toHaveAttribute('src', '/silhouettes/male.png')
  })

  it('llama a onClose al pulsar el botón de cerrar', () => {
    const onClose = vi.fn()
    renderMap([makeCharacter({ id: 'a', name: 'A', heightCm: 165 })], onClose)
    fireEvent.click(screen.getByTestId('height-map-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
