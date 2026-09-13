import { describe, expect, it } from 'vitest'
import { EMPTY_MAP_CANVAS, MAX_MAP_OBJECTS, sanitizeMapCanvas } from '../map-canvas.js'

describe('sanitizeMapCanvas', () => {
  it('devuelve lienzo vacío si el input es null', () => {
    expect(sanitizeMapCanvas(null)).toEqual({ canvas: EMPTY_MAP_CANVAS })
  })

  it('rechaza un cuerpo que no es objeto', () => {
    expect(sanitizeMapCanvas('x')).toEqual({ error: 'CANVAS_INVALID' })
  })

  it('conserva un icono válido y descarta tipos desconocidos', () => {
    const result = sanitizeMapCanvas({
      objects: [
        { id: 'icon-abc1', type: 'icon', iconId: 'castle', x: 10, y: 20, width: 64, height: 64, rotation: 0, stroke: '#2c2416' },
        { id: 'bad', type: 'virus', payload: '<script>' },
        { id: 'path-abcd', type: 'path', points: [0, 0, 8, 8], stroke: '#ab152b', strokeWidth: 3 },
      ],
    })
    expect(result).toEqual({
      canvas: {
        version: 1,
        objects: [
          { id: 'icon-abc1', type: 'icon', iconId: 'castle', x: 10, y: 20, width: 64, height: 64, rotation: 0, stroke: '#2c2416' },
          { id: 'path-abcd', type: 'path', points: [0, 0, 8, 8], stroke: '#ab152b', strokeWidth: 3 },
        ],
      },
    })
  })

  it('rechaza iconId con caracteres raros y colores que no son hex', () => {
    const result = sanitizeMapCanvas({
      objects: [
        { id: 'icon-xxxx', type: 'icon', iconId: 'castle/../x', x: 0, y: 0, width: 64, height: 64, rotation: 0, stroke: 'red' },
        { id: 'text-xxxx', type: 'text', x: 0, y: 0, width: 100, rotation: 0, text: 'Hola', fontSize: 18, fill: 'javascript:alert(1)' },
      ],
    })
    expect(result).toEqual({
      canvas: {
        version: 1,
        objects: [
          { id: 'text-xxxx', type: 'text', x: 0, y: 0, width: 100, rotation: 0, text: 'Hola', fontSize: 18, fill: '#2c2416' },
        ],
      },
    })
  })

  it('recorta texto largo', () => {
    const result = sanitizeMapCanvas({
      objects: [{ id: 'text-yyyy', type: 'text', x: 0, y: 0, width: 200, rotation: 0, text: 'a'.repeat(5000), fontSize: 22, fill: '#2c2416' }],
    })
    expect('canvas' in result && result.canvas.objects[0].type === 'text' && result.canvas.objects[0].text.length).toBe(2000)
  })

  it('rechaza más objetos del tope', () => {
    const objects = Array.from({ length: MAX_MAP_OBJECTS + 1 }, (_, i) => ({
      id: `icon-${String(i).padStart(6, '0')}`,
      type: 'icon',
      iconId: 'hut',
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      rotation: 0,
      stroke: '#2c2416',
    }))
    expect(sanitizeMapCanvas({ objects })).toEqual({ error: 'CANVAS_TOO_LARGE' })
  })
})
