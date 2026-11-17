import { describe, expect, it } from 'vitest'
import { changeStatsPeriod, changeStatsRange, changeStatsScope, childDocuments, rootDocuments, statsRequestQuery } from '../stats-scope'
import type { StatsDocument, StatsQuery } from '@/types/stats'

const base: StatsQuery = { period: 'custom', from: '2026-08-14', to: '2026-09-12', timeZone: 'UTC' }
const documents: StatsDocument[] = [
  { id: 'root', title: 'Manuscrito', projectId: 'folder', parentId: null },
  { id: 'scene', title: 'Escena', projectId: 'folder', parentId: 'root' },
  { id: 'other', title: 'Otro', projectId: 'b', parentId: null },
]

describe('hierarchical statistics filters', () => {
  it('clears document and subpage when the folder returns to all', () => {
    const narrowed = changeStatsScope({ ...base, projectId: 'folder', documentId: 'root', subpageId: 'scene' }, 'projectId', '')
    expect(narrowed).toEqual(base)
    expect(statsRequestQuery(narrowed)).toEqual({ from: '2026-08-14', to: '2026-09-12', timeZone: 'UTC' })
  })
  it('shows only root documents of the chosen folder and children of the chosen document', () => {
    expect(rootDocuments(documents, 'folder').map((document) => document.id)).toEqual(['root'])
    expect(childDocuments(documents, 'root').map((document) => document.id)).toEqual(['scene'])
  })
  it('sends the subpage as documentId so the API subtree is that node', () => {
    const query = changeStatsScope(changeStatsScope(changeStatsScope(base, 'projectId', 'folder'), 'documentId', 'root'), 'subpageId', 'scene')
    expect(statsRequestQuery(query)).toEqual({ from: '2026-08-14', to: '2026-09-12', timeZone: 'UTC', projectId: 'folder', documentId: 'scene' })
  })
  it('keeps from and to ordered when a bound crosses the other', () => {
    expect(changeStatsRange(base, 'from', '2026-09-20')).toMatchObject({ from: '2026-09-20', to: '2026-09-20', period: 'custom' })
    expect(changeStatsRange(base, 'to', '2026-08-01')).toMatchObject({ from: '2026-08-01', to: '2026-08-01' })
  })
  it('maps period presets to allTime or days and keeps custom dates hidden from presets', () => {
    expect(statsRequestQuery(changeStatsPeriod(base, 'all', '2026-09-12'))).toEqual({ timeZone: 'UTC', allTime: true })
    expect(statsRequestQuery(changeStatsPeriod(base, '7', '2026-09-12'))).toEqual({ timeZone: 'UTC', days: 7 })
    expect(statsRequestQuery(changeStatsPeriod(base, '30', '2026-09-12'))).toEqual({ timeZone: 'UTC', days: 30 })
    expect(statsRequestQuery(changeStatsPeriod(base, '60', '2026-09-12'))).toEqual({ timeZone: 'UTC', days: 60 })
    expect(statsRequestQuery(changeStatsPeriod(base, '90', '2026-09-12'))).toEqual({ timeZone: 'UTC', days: 90 })
    expect(statsRequestQuery(changeStatsPeriod(base, 'custom', '2026-09-12'))).toEqual({ from: '2026-08-14', to: '2026-09-12', timeZone: 'UTC' })
  })
})
