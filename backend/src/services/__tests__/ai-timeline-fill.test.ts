import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, authorize, quota, complete, build } = vi.hoisted(() => ({
  db: {
    project: { findFirst: vi.fn() },
    document: { aggregate: vi.fn(), findMany: vi.fn() },
    timelineEra: { findMany: vi.fn() },
    timelineEvent: { findMany: vi.fn() },
    character: { findMany: vi.fn() },
  },
  authorize: vi.fn(),
  quota: vi.fn(),
  complete: vi.fn(),
  build: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
vi.mock('../ai-access.js', () => ({ authorizeAi: authorize, withAiQuota: quota }))
vi.mock('../../lib/ai-client.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/ai-client.js')>()),
  aiClient: { complete, status: () => ({ providers: [{ id: 'balanced', available: true }], fallbackEnabled: false }) },
}))
vi.mock('../../lib/rag-service.js', () => ({ ragService: { build } }))

import { fillTimeline } from '../ai-timeline-fill.js'

const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'En la Era imperial Ada corona al rey.' }]

describe('timeline fill generation gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorize.mockResolvedValue({ permissions: ['ai_suggestions'], canCopy: false })
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) =>
      run({ signal: new AbortController().signal, consumeRetry: async () => undefined }))
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    db.timelineEra.findMany.mockResolvedValue([])
    db.timelineEvent.findMany.mockResolvedValue([])
    db.character.findMany.mockResolvedValue([{ name: 'Ada' }])
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } })
    db.document.findMany.mockResolvedValue([])
    build.mockResolvedValue({ text: 'En la Era imperial Ada corona al rey.', sources, directed: false })
    complete.mockResolvedValue({
      content: JSON.stringify({
        eras: [{ name: 'Era imperial', startDate: '1' }],
        events: [{ title: 'Coronación', description: 'Ada corona al rey.', eraName: 'Era imperial', characterNames: ['Ada'] }],
      }),
      provider: 'balanced',
      model: 'test-model',
    })
  })

  it('refuses empty manuscripts without quota or a provider call', async () => {
    await expect(fillTimeline('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
  })

  it('refuses tiny manuscripts before contacting the model', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 12 } })
    await expect(fillTimeline('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })

  it('returns eras and events from document evidence without persisting', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    const result = await fillTimeline('p1', 'u1', { locale: 'es' })
    expect(result.eras[0]).toMatchObject({ name: 'Era imperial', startDate: '1' })
    expect(result.events[0]).toMatchObject({ title: 'Coronación', eraName: 'Era imperial' })
    expect(db.timelineEra.create).toBeUndefined()
    expect(complete).toHaveBeenCalledTimes(1)
    const system = complete.mock.calls[0][0].messages[0].content as string
    expect(system).toContain('50 eras and 50 events')
    expect(system).toContain('Do not stop at 1–3')
  })

  it('keeps existing titles only when empty fields can be filled', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.timelineEvent.findMany.mockResolvedValue([{
      title: 'Coronación', description: 'Ya escrito.', date: null, endDate: null, eraId: null, characterIds: [],
    }])
    complete.mockResolvedValue({
      content: JSON.stringify({
        eras: [],
        events: [{ title: 'Coronación', description: 'No debe aplicar', date: 'Año 3' }],
      }),
      provider: 'balanced',
      model: 'test-model',
    })
    const result = await fillTimeline('p1', 'u1', {})
    expect(result.events[0]).toEqual({ title: 'Coronación', date: 'Año 3' })
  })

  it('drops names already stored when nothing empty remains', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.timelineEra.findMany.mockResolvedValue([{ name: 'Era imperial', startDate: '1', endDate: '2' }])
    db.timelineEvent.findMany.mockResolvedValue([{
      title: 'Coronación', description: 'd', date: '1', endDate: '2', eraId: 'e1', characterIds: ['c1'],
    }])
    await expect(fillTimeline('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT' })
  })
})
