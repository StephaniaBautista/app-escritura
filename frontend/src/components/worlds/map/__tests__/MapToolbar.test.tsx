import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MapToolbar } from '../MapToolbar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MapToolbar', () => {
  it('cambia de herramienta y de tinta', () => {
    const onTool = vi.fn()
    const onColor = vi.fn()
    render(
      <MapToolbar
        tool="select"
        color="#2c2416"
        colors={['#2c2416', '#ab152b']}
        strokeWidth={4}
        canUndo={false}
        canRedo={false}
        hasBackground={false}
        saving={false}
        onTool={onTool}
        onColor={onColor}
        onStrokeWidth={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onBackground={vi.fn()}
        onClearBackground={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'worldApp.mapTool.draw' }))
    expect(onTool).toHaveBeenCalledWith('draw')
    fireEvent.click(screen.getAllByRole('button', { name: 'worldApp.mapColor' })[1])
    expect(onColor).toHaveBeenCalledWith('#ab152b')
  })
})
