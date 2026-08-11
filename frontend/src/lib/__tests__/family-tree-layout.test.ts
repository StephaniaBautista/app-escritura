import { describe, it, expect } from 'vitest'
import {
  buildFamilyLayout,
  FAMILY_TREE_PERSON_WIDTH,
  type FamilyCharacterRef,
  type FamilyRelationRef,
} from '../family-tree-layout'

const char = (id: string, parentIds: string[] = []): FamilyCharacterRef => ({ id, parentIds })

const romance = (a: string, b: string): FamilyRelationRef => ({
  characterAId: a,
  characterBId: b,
  type: 'romance',
})

function posOf(layout: ReturnType<typeof buildFamilyLayout>, id: string) {
  return layout.persons.find((p) => p.id === id)
}

describe('buildFamilyLayout', () => {
  it('une a una pareja romántica en la misma fila y centra a sus hijos', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('c', ['a', 'b'])],
      [romance('a', 'b')],
    )

    const a = posOf(layout, 'a')
    const b = posOf(layout, 'b')
    const c = posOf(layout, 'c')
    expect(a?.partnerId).toBe('b')
    expect(b?.partnerId).toBe('a')
    expect(a?.level).toBe(b?.level)
    expect(c?.level).toBeGreaterThan(a?.level ?? -1)
    expect(c?.centerX).toBeGreaterThan(a?.centerX ?? Infinity)
    expect(c?.centerX).toBeLessThan(b?.centerX ?? -Infinity)
    expect(layout.couples).toHaveLength(1)
    expect(layout.branches).toHaveLength(1)
    expect(layout.branches[0].anchorX).toBe(layout.couples[0].centerX)
    expect(layout.branches[0].children).toHaveLength(1)
  })

  it('une a coparentes aunque no tengan relación explícita', () => {
    const layout = buildFamilyLayout([char('a'), char('b'), char('c', ['a', 'b'])], [])

    expect(posOf(layout, 'a')?.partnerId).toBe('b')
    expect(posOf(layout, 'b')?.partnerId).toBe('a')
    expect(layout.couples).toHaveLength(1)
  })

  it('mantiene al hijo entre sus padres aunque haya otras raíces en la fila', () => {
    const layout = buildFamilyLayout(
      [char('r1'), char('r2'), char('a'), char('b'), char('c', ['a', 'b'])],
      [romance('a', 'b')],
    )

    const a = posOf(layout, 'a')
    const b = posOf(layout, 'b')
    const c = posOf(layout, 'c')
    expect(c?.centerX).toBeGreaterThan(a?.centerX ?? Infinity)
    expect(c?.centerX).toBeLessThan(b?.centerX ?? -Infinity)
  })

  it('separa a los hermanos sin solaparlos', () => {
    const layout = buildFamilyLayout(
      [char('p'), char('c1', ['p']), char('c2', ['p']), char('c3', ['p'])],
      [],
    )

    const xs = ['c1', 'c2', 'c3'].map((id) => posOf(layout, id)?.centerX ?? 0)
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(FAMILY_TREE_PERSON_WIDTH)
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(FAMILY_TREE_PERSON_WIDTH)
  })

  it('incluye personajes desconectados', () => {
    const layout = buildFamilyLayout([char('x'), char('y', ['x'])], [])

    expect(layout.persons).toHaveLength(2)
    expect(posOf(layout, 'x')?.level).toBe(0)
    expect(posOf(layout, 'y')?.level).toBeGreaterThan(0)
  })

  it('dibuja a una pareja sin hijos como unidad unida', () => {
    const layout = buildFamilyLayout([char('a'), char('b')], [romance('a', 'b')])

    expect(posOf(layout, 'a')?.partnerId).toBe('b')
    expect(posOf(layout, 'b')?.partnerId).toBe('a')
    expect(layout.couples).toHaveLength(1)
    expect(layout.branches).toHaveLength(0)
  })

  it('apunta la rama al centro de la hija, no al centro de su pareja', () => {
    const layout = buildFamilyLayout(
      [char('abuela'), char('abuelo'), char('madre', ['abuela', 'abuelo']), char('padre')],
      [romance('madre', 'padre')],
    )

    const branch = layout.branches[0]
    const madre = posOf(layout, 'madre')
    const pareja = layout.couples.find((c) => c.aId === 'madre' || c.bId === 'madre')
    expect(branch.children).toHaveLength(1)
    expect(branch.children[0].centerX).toBe(madre?.centerX)
    expect(branch.children[0].centerX).not.toBe(pareja?.centerX)
  })

  it('no se cuelga con ciclos en parentIds', () => {
    const layout = buildFamilyLayout([char('a', ['b']), char('b', ['a'])], [])

    expect(layout.persons).toHaveLength(2)
    expect(layout.branches.length).toBeLessThanOrEqual(2)
  })
})
