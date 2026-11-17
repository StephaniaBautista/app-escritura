import { describe, expect, it } from 'vitest'
import {
  eraPatchFromFill,
  eventPatchFromFill,
  matchCharacterIds,
  persistTimelineFills,
  uniqueNewEras,
  uniqueNewEvents,
} from '../timeline-ai'
import type { TimelineEra, TimelineEvent } from '@/types/timeline'

const era = (over: Partial<TimelineEra> = {}): TimelineEra => ({
  id: 'e1', projectId: 'p1', name: 'Era imperial', color: null, precision: 'year',
  startDate: '1', endDate: '2', rollover: 'newYear', order: 0, createdAt: '', updatedAt: '',
  ...over,
})

const event = (over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'v1', projectId: 'p1', title: 'Coronación', date: '1', description: 'd', order: 0, eraId: 'e1',
  characterIds: ['c1'], icon: null, color: null, groupName: null, precision: 'year', endDate: '2',
  label: null, labelColor: null, imageUrl: null, relatedEventIds: [], relatedDocumentIds: [], subplotId: null,
  createdAt: '', updatedAt: '',
  ...over,
})

describe('timeline AI fill apply', () => {
  it('fills only empty era and event fields', () => {
    expect(eraPatchFromFill(era(), { name: 'Era imperial', startDate: '99', endDate: '100' })).toBeNull()
    expect(eraPatchFromFill(era({ startDate: null, endDate: null }), { name: 'Era imperial', startDate: '3' })).toEqual({ startDate: '3' })
    expect(eventPatchFromFill(event(), { title: 'Coronación', description: 'Inventado' }, 'e2', ['c9'])).toBeNull()
    expect(eventPatchFromFill(event({ description: null, eraId: null, characterIds: [] }), { title: 'Coronación', description: 'Ada jura.' }, 'e1', ['c1'])).toEqual({
      description: 'Ada jura.', eraId: 'e1', characterIds: ['c1'],
    })
  })

  it('drops duplicate or already stored names before a batch create', () => {
    expect(uniqueNewEras(
      [{ name: 'Era imperial' }, { name: 'era imperial' }, { name: 'Exilio' }],
      ['Era imperial'],
    ).map((fill) => fill.name)).toEqual(['Exilio'])
    expect(uniqueNewEvents(
      [{ title: 'Coronación' }, { title: 'coronación' }, { title: 'Huida' }],
      ['Coronación'],
    ).map((fill) => fill.title)).toEqual(['Huida'])
  })

  it('matches character names to ids without inventing', () => {
    expect(matchCharacterIds(['Ada', 'Nadie'], [{ id: 'c1', name: 'Ada' }])).toEqual(['c1'])
  })

  it('creates missing rows and skips complete duplicates', async () => {
    const created: string[] = []
    const result = await persistTimelineFills(
      'p1',
      {
        eras: [{ name: 'Era imperial' }, { name: 'Exilio', startDate: '10' }],
        events: [{ title: 'Coronación' }, { title: 'Huida', eraName: 'Exilio' }],
      },
      { eras: [era()], events: [event()] },
      [{ id: 'c1', name: 'Ada' }],
      {
        createEra: async (_projectId, data) => {
          created.push(`era:${data.name}`)
          return era({ id: 'e2', name: data.name ?? 'Exilio', startDate: data.startDate ?? null, endDate: null })
        },
        updateEra: async () => era(),
        create: async (_projectId, data) => {
          created.push(`event:${data.title}`)
          return event({ id: 'v2', title: data.title ?? 'Huida' })
        },
        update: async () => event(),
      },
    )
    expect(created).toEqual(['era:Exilio', 'event:Huida'])
    expect(result).toEqual({ createdEras: 1, createdEvents: 1, updated: 0, failed: 0, skipped: 2 })
  })
})
