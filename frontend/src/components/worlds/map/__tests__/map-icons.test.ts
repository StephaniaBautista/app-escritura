import { describe, expect, it } from 'vitest'
import { mdiCastle, mdiHome, mdiTerrain } from '@mdi/js'
import { getMapIcon, MAP_ICONS, mapIconSvg } from '../map-icons'

describe('map-icons', () => {
  it('usa paths de Material Design Icons, no trazos propios', () => {
    expect(MAP_ICONS.length).toBeGreaterThan(50)
    expect(getMapIcon('castle')?.path).toBe(mdiCastle)
    expect(getMapIcon('house')?.path).toBe(mdiHome)
    expect(getMapIcon('mountain')?.path).toBe(mdiTerrain)
    for (const icon of MAP_ICONS) {
      expect(icon.path.startsWith('M')).toBe(true)
      expect(icon.path.length).toBeGreaterThan(20)
    }
  })

  it('serializa un svg relleno con el path oficial', () => {
    const castle = getMapIcon('castle')
    expect(castle).toBeDefined()
    if (!castle) return
    expect(mapIconSvg(castle, '#2c2416')).toContain(mdiCastle)
    expect(mapIconSvg(castle, '#2c2416')).toContain('viewBox="0 0 24 24"')
  })
})
