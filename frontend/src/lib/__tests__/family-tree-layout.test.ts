import { describe, it, expect } from 'vitest'
import {
  buildFamilyLayout,
  FAMILY_TREE_COMPONENT_GAP,
  FAMILY_TREE_COUPLE_GAP,
  FAMILY_TREE_PERSON_WIDTH,
  FAMILY_TREE_SIBLING_BAR_GAP,
  FAMILY_TREE_SIBLING_GAP,
  FAMILY_TREE_SUBTREE_GAP,
  type FamilyCharacterRef,
  type FamilyRelationRef,
} from '../family-tree-layout'

const char = (id: string, parentIds: string[] = []): FamilyCharacterRef => ({ id, parentIds })

const romance = (a: string, b: string): FamilyRelationRef => ({
  characterAId: a,
  characterBId: b,
  type: 'romance',
})

const family = (a: string, b: string, label: string): FamilyRelationRef => ({
  characterAId: a,
  characterBId: b,
  type: 'family',
  label,
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

  it('incluye personajes desconectados y su progenitor desconocido', () => {
    const layout = buildFamilyLayout([char('x'), char('y', ['x'])], [])

    expect(layout.persons).toHaveLength(3)
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

    expect(layout.persons).toHaveLength(4)
    expect(layout.branches.length).toBeLessThanOrEqual(2)
  })

  it('marca a dos personajes declarados hermanas con relación Familia', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('c')],
      [family('a', 'b', 'hermanas')],
    )

    const a = posOf(layout, 'a')
    const b = posOf(layout, 'b')
    expect(layout.siblingMarks).toHaveLength(1)
    const mark = layout.siblingMarks[0]
    expect(mark.label).toBe('hermanas')
    expect(mark.memberIds).toEqual(expect.arrayContaining(['a', 'b']))
    expect(a?.level).toBe(b?.level)
    expect(Math.abs((a?.centerX ?? 0) - (b?.centerX ?? 0))).toBe(
      FAMILY_TREE_PERSON_WIDTH + FAMILY_TREE_SIBLING_GAP,
    )
    expect(a?.partnerId).toBeNull()
    expect(b?.partnerId).toBeNull()
    expect(posOf(layout, 'c')).toBeDefined()
  })

  it('agrupa a tres hermanos con relaciones sueltas', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('c')],
      [family('a', 'b', 'hermano'), family('b', 'c', 'hermano')],
    )

    expect(layout.siblingMarks).toHaveLength(1)
    expect(layout.siblingMarks[0].memberIds.sort()).toEqual(['a', 'b', 'c'])
    const xs = ['a', 'b', 'c'].map((id) => posOf(layout, id)?.centerX ?? 0)
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(FAMILY_TREE_PERSON_WIDTH)
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(FAMILY_TREE_PERSON_WIDTH)
  })

  it('no marca relaciones de familia no fraternales', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b')],
      [family('a', 'b', 'madre')],
    )

    expect(layout.siblingMarks).toHaveLength(0)
  })

  it('no marca hermanos si comparten padre pero no tienen relación explícita', () => {
    const layout = buildFamilyLayout([char('p'), char('c1', ['p']), char('c2', ['p'])], [])

    expect(layout.siblingMarks).toHaveLength(0)
    expect(layout.branches).toHaveLength(1)
  })

  it('fusiona grupos de hermanos conectados por una relación puente', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('c'), char('d')],
      [
        family('a', 'b', 'hermanos'),
        family('c', 'd', 'hermanos'),
        family('b', 'c', 'hermanos'),
      ],
    )

    expect(layout.siblingMarks).toHaveLength(1)
    expect(layout.siblingMarks[0].memberIds.sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('mantiene la evolución fuera del grupo salvo que la relación la incluya', () => {
    const layout = buildFamilyLayout(
      [char('aliciaV1'), char('aliciaV2'), char('lizzie'), char('kitty')],
      [family('lizzie', 'aliciaV2', 'hermanas')],
    )

    expect(layout.siblingMarks).toHaveLength(1)
    const mark = layout.siblingMarks[0]
    expect(mark.memberIds.sort()).toEqual(['aliciaV2', 'lizzie'])
    expect(mark.memberIds).not.toContain('aliciaV1')
  })

  it('mantiene la barra de hermanos aunque un miembro esté en una pareja', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('c')],
      [romance('a', 'b'), family('b', 'c', 'hermanos')],
    )

    expect(layout.couples).toHaveLength(1)
    expect(layout.siblingMarks).toHaveLength(1)
    expect(layout.siblingMarks[0].memberIds.sort()).toEqual(['b', 'c'])
  })

  it('separa verticalmente la barra de hermanos de las barras de pareja', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('a1'), char('b'), char('b1')],
      [family('a', 'b', 'hermanos'), romance('a', 'a1'), romance('b', 'b1')],
    )

    expect(layout.couples).toHaveLength(2)
    expect(layout.siblingMarks).toHaveLength(1)
    const siblingBarY = layout.siblingMarks[0].barY
    for (const couple of layout.couples) {
      expect(siblingBarY - couple.barY).toBe(FAMILY_TREE_SIBLING_BAR_GAP)
    }
  })

  it('no corta la barra de hermanos en el borde inferior del canvas', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('a1'), char('b'), char('b1')],
      [family('a', 'b', 'hermanos'), romance('a', 'a1'), romance('b', 'b1')],
    )

    for (const mark of layout.siblingMarks) {
      expect(mark.barY).toBeLessThan(layout.height)
      expect(layout.height - mark.barY).toBeGreaterThanOrEqual(24)
    }
  })

  it('marca como primos a quienes comparten abuelos sin ser hermanos', () => {
    const layout = buildFamilyLayout(
      [char('g'), char('a', ['g']), char('b', ['g']), char('x', ['a']), char('y', ['b'])],
      [],
    )

    expect(layout.cousinMarks).toHaveLength(1)
    expect(layout.cousinMarks[0].memberIds.sort()).toEqual(['x', 'y'])
  })

  it('marca primos declarados aunque no compartan abuelos', () => {
    const layout = buildFamilyLayout(
      [char('x'), char('z')],
      [family('x', 'z', 'primos')],
    )

    expect(layout.cousinMarks).toHaveLength(1)
    expect(layout.cousinMarks[0].memberIds.sort()).toEqual(['x', 'z'])
  })

  it('reconoce el label "Primo/a" del datalist de relaciones', () => {
    const layout = buildFamilyLayout(
      [char('x'), char('z')],
      [family('x', 'z', 'Primo/a')],
    )

    expect(layout.cousinMarks).toHaveLength(1)
    expect(layout.cousinMarks[0].memberIds.sort()).toEqual(['x', 'z'])
  })

  it('no marca como primos a padres e hijos en línea directa', () => {
    const layout = buildFamilyLayout(
      [char('gg'), char('a', ['gg']), char('x', ['a'])],
      [],
    )

    expect(layout.cousinMarks).toHaveLength(0)
  })

  it('crea una tarjeta de progenitor desconocido para un padre sin pareja', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('x', ['a'])],
      [],
    )

    const ghost = layout.persons.find((p) => p.id.startsWith('__unknown-partner-'))
    expect(ghost).toBeDefined()
    expect(layout.couples).toHaveLength(1)
    expect(layout.couples[0].aId).toBe('a')
    expect(layout.couples[0].bId).toBe(ghost?.id)
  })

  it('mantiene la barra de primos dentro del alto del canvas', () => {
    const layout = buildFamilyLayout(
      [char('g'), char('a', ['g']), char('b', ['g']), char('x', ['a']), char('y', ['b'])],
      [family('a', 'b', 'hermanos')],
    )

    for (const mark of layout.cousinMarks) {
      expect(mark.barY).toBeLessThan(layout.height)
    }
  })

  it('separa con más espacio dos familias no relacionadas que dos raíces de la misma familia', () => {
    const unrelated = buildFamilyLayout(
      [char('a'), char('b'), char('x'), char('y')],
      [romance('a', 'b'), romance('x', 'y')],
    )
    const a = posOf(unrelated, 'a')
    const x = posOf(unrelated, 'x')
    expect(Math.abs((a?.centerX ?? 0) - (x?.centerX ?? 0))).toBeGreaterThanOrEqual(
      FAMILY_TREE_COMPONENT_GAP,
    )

    const siblings = buildFamilyLayout(
      [char('p1'), char('p2'), char('s1', ['p1']), char('s2', ['p2'])],
      [family('s1', 's2', 'hermanas')],
    )
    const p1 = posOf(siblings, 'p1')
    const p2 = posOf(siblings, 'p2')
    const subtreeWidth = FAMILY_TREE_PERSON_WIDTH * 2 + FAMILY_TREE_SIBLING_GAP
    const edgeGap = Math.abs((p1?.centerX ?? 0) - (p2?.centerX ?? 0)) - subtreeWidth
    expect(edgeGap).toBe(FAMILY_TREE_SUBTREE_GAP)
  })

  it('mantiene juntas las raíces del mismo componente aunque haya otro componente en medio', () => {
    const layout = buildFamilyLayout(
      [char('a'), char('b'), char('x'), char('c'), char('d')],
      [romance('a', 'b'), romance('c', 'd'), family('a', 'd', 'hermanas')],
    )

    const a = posOf(layout, 'a')
    const c = posOf(layout, 'c')
    const x = posOf(layout, 'x')
    expect(Math.abs((a?.centerX ?? 0) - (c?.centerX ?? 0))).toBe(
      FAMILY_TREE_PERSON_WIDTH * 2 + FAMILY_TREE_COUPLE_GAP + FAMILY_TREE_SUBTREE_GAP,
    )
    expect(x?.centerX).toBeGreaterThan(c?.centerX ?? Infinity)
  })

  it('mantiene todas las tarjetas dentro del ancho calculado', () => {
    const layout = buildFamilyLayout(
      [
        char('parent-a'),
        char('parent-b'),
        char('child-a', ['parent-a', 'parent-b']),
        char('child-b', ['parent-a', 'parent-b']),
        char('unrelated'),
      ],
      [romance('parent-a', 'parent-b')],
    )

    for (const person of layout.persons) {
      expect(person.centerX - FAMILY_TREE_PERSON_WIDTH / 2).toBeGreaterThanOrEqual(0)
      expect(person.centerX + FAMILY_TREE_PERSON_WIDTH / 2).toBeLessThanOrEqual(layout.width)
    }
  })

  it('evita solapar hijos de unidades familiares distintas en la misma fila', () => {
    const layout = buildFamilyLayout(
      [
        char('a'),
        char('b'),
        char('c'),
        char('d'),
        char('e'),
        char('f', ['c', 'b']),
        char('g', ['a']),
        char('h', ['d']),
        char('i', ['d', 'e']),
        char('j', ['a', 'd']),
        char('k'),
        char('l', ['c', 'd']),
      ],
      [
        family('a', 'd', 'hermanos'),
        family('b', 'c', 'hermanos'),
        family('b', 'd', 'hermanos'),
      ],
    )

    const sameLevel = layout.persons
      .filter((person) => person.level === 1)
      .sort((a, b) => a.centerX - b.centerX)
    for (let index = 1; index < sameLevel.length; index += 1) {
      expect(sameLevel[index].centerX - sameLevel[index - 1].centerX)
        .toBeGreaterThanOrEqual(FAMILY_TREE_PERSON_WIDTH)
    }
  })
})
