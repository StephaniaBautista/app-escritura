import { describe, expect, it } from 'vitest'
import { roleplaySegments } from '../roleplay-text'

describe('roleplaySegments', () => {
  it('marks action beats written between asterisks', () => {
    expect(roleplaySegments('*Se gira hacia la puerta.* No lo sé todavía.')).toEqual([
      { text: 'Se gira hacia la puerta.', beat: true },
      { text: ' No lo sé todavía.', beat: false },
    ])
  })

  it('keeps dialogue with several beats in order', () => {
    expect(roleplaySegments('*Suspira.* Vale. *Abre el mapa.* Mira aquí.')).toEqual([
      { text: 'Suspira.', beat: true },
      { text: ' Vale. ', beat: false },
      { text: 'Abre el mapa.', beat: true },
      { text: ' Mira aquí.', beat: false },
    ])
  })

  it('leaves lone or unclosed asterisks as plain text', () => {
    expect(roleplaySegments('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6', beat: false }])
    expect(roleplaySegments('*sin cerrar')).toEqual([{ text: '*sin cerrar', beat: false }])
    expect(roleplaySegments('**')).toEqual([{ text: '**', beat: false }])
  })
})
