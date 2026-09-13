import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MapIconPalette } from '../MapIconPalette'
import { MAP_ICONS } from '../map-icons'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MapIconPalette', () => {
  it('ofrece sellos y permite elegir uno', () => {
    const onPick = vi.fn()
    render(
      <MapIconPalette
        category="building"
        ink="#2c2416"
        onCategory={vi.fn()}
        onPick={onPick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'worldApp.mapIcon.castle' }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'castle' }))
    expect(MAP_ICONS.length).toBeGreaterThan(50)
  })
})
