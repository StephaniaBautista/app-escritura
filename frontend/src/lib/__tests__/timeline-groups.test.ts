import { describe, expect, it } from 'vitest'
import { collectEventGroupNames, normalizeGroupName } from '../timeline-groups'

describe('collectEventGroupNames', () => {
  it('returns unique sorted non-empty group names', () => {
    const events = [
      { groupName: 'Batallas' },
      { groupName: '  Viajes  ' },
      { groupName: null },
      { groupName: 'Batallas' },
      { groupName: '' },
    ]
    expect(collectEventGroupNames(events)).toEqual(['Batallas', 'Viajes'])
  })

  it('returns empty array when no groups exist', () => {
    expect(collectEventGroupNames([{ groupName: null }, { groupName: '  ' }])).toEqual([])
  })
})

describe('normalizeGroupName', () => {
  it('trims and caps length', () => {
    expect(normalizeGroupName('  Oz  ')).toBe('Oz')
    expect(normalizeGroupName('')).toBeNull()
    expect(normalizeGroupName(null)).toBeNull()
    expect(normalizeGroupName('x'.repeat(120))?.length).toBe(100)
  })
})
