import { describe, it, expect } from 'vitest'
import { edgeStroke, LINE_STYLE_DASH } from '../diagram-edges'

describe('diagram-edges', () => {
  it('usa el color por tipo cuando no hay lineColor', () => {
    expect(edgeStroke('custom', null)).toBe('#f59e0b')
    expect(edgeStroke('romance', undefined)).toBe('#ec4899')
    expect(edgeStroke('family', null)).toBe('#8b5cf6')
  })

  it('lineColor personalizado gana al color por tipo', () => {
    expect(edgeStroke('custom', '#22c55e')).toBe('#22c55e')
    expect(edgeStroke('romance', '#ffffff')).toBe('#ffffff')
  })

  it('mapea estilos a stroke-dasharray', () => {
    expect(LINE_STYLE_DASH.solid).toBeUndefined()
    expect(LINE_STYLE_DASH.dashed).toBe('8 6')
    expect(LINE_STYLE_DASH.dotted).toBe('2 5')
  })
})
