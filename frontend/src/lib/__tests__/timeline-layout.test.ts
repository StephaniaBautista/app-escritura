import { describe, expect, it } from 'vitest'
import { labelWidthPercent, stackRows } from '../timeline-layout'

describe('stackRows', () => {
  it('coloca en la misma fila los elementos que no se solapan', () => {
    expect(stackRows([{ x: 0, w: 10 }, { x: 20, w: 10 }, { x: 40, w: 10 }])).toEqual([0, 0, 0])
  })

  it('baja de fila los elementos que se solapan y reutiliza filas libres', () => {
    expect(stackRows([{ x: 0, w: 30 }, { x: 10, w: 10 }, { x: 15, w: 10 }, { x: 35, w: 5 }])).toEqual([0, 1, 2, 0])
  })

  it('respeta el índice original aunque la entrada no esté ordenada', () => {
    expect(stackRows([{ x: 50, w: 10 }, { x: 0, w: 60 }])).toEqual([1, 0])
  })

  it('vacío devuelve vacío', () => {
    expect(stackRows([])).toEqual([])
  })
})

describe('labelWidthPercent', () => {
  it('crece con la longitud y se acota', () => {
    expect(labelWidthPercent('')).toBe(8)
    expect(labelWidthPercent('Cambio de Ozma a Tip')).toBeGreaterThan(labelWidthPercent('Oz'))
    expect(labelWidthPercent('x'.repeat(200))).toBe(40)
  })
})
