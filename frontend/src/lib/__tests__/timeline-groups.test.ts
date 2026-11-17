import { describe, expect, it } from 'vitest'
import { collectEventGroupNames, groupEventsByLane, normalizeGroupName } from '../timeline-groups'

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

describe('groupEventsByLane', () => {
  const romance = { id: 'sub-1', title: 'Romance', color: '#aa3366', order: 1 }
  const revenge = { id: 'sub-2', title: 'Venganza', color: '#2255aa', order: 0 }
  const labels = { general: 'General', unknownSubplot: 'Subtrama' }

  it('keeps main-plot events in current groups and puts subplot events on extra lanes', () => {
    const events = [
      { id: 'a', subplotId: null, groupName: 'Batallas' },
      { id: 'b', subplotId: 'sub-1', groupName: 'Batallas' },
      { id: 'c', subplotId: null, groupName: null },
      { id: 'd', subplotId: 'sub-2', groupName: 'Viajes' },
      { id: 'e', subplotId: 'sub-1', groupName: null },
    ]
    const lanes = groupEventsByLane(events, (event) => event, [romance, revenge], labels, 'violet')
    expect(lanes.map((lane) => ({ key: lane.key, name: lane.name, kind: lane.kind, color: lane.color, ids: lane.items.map((item) => item.id) }))).toEqual([
      { key: 'group:Batallas', name: 'Batallas', kind: 'group', color: null, ids: ['a'] },
      { key: 'group:', name: 'General', kind: 'group', color: null, ids: ['c'] },
      { key: 'subplot:sub-2', name: 'Venganza', kind: 'subplot', color: '#2255aa', ids: ['d'] },
      { key: 'subplot:sub-1', name: 'Romance', kind: 'subplot', color: '#aa3366', ids: ['b', 'e'] },
    ])
  })

  it('uses fallback name and color when the subplot is unknown', () => {
    const events = [{ id: 'x', subplotId: 'gone', groupName: 'Batallas' }]
    const lanes = groupEventsByLane(events, (event) => event, [], labels, 'violet')
    expect(lanes).toEqual([
      { key: 'subplot:gone', name: 'Subtrama', kind: 'subplot', color: 'violet', items: events },
    ])
  })
})
