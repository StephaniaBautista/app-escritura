import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, authorize, quota, complete, build } = vi.hoisted(() => ({
  db: {
    project: { findFirst: vi.fn() },
    document: { aggregate: vi.fn(), findMany: vi.fn() },
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

import { suggestTags } from '../ai-tag-suggestions.js'
import { TAG_STYLE_MARKER } from '../ai-tag-style.js'

const completeMeta = {
  rating: 'teen', type: ['Drama'], isFanfic: false, characters: [{ name: 'Ada' }], tags: ['Angst'],
  narrator: 'yo', ending: 'cierre', worldContext: 'w', initialSituation: 'i', centralTheme: 't',
  problems: 'p', protagonistLife: 'l', protagonistEvolution: 'e',
  structure: { sections: [{ id: 'inicio', content: 'Ada llega.' }] },
}
const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'Ada muere en la última página.' }]

describe('tag suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorize.mockResolvedValue({ permissions: ['ai_suggestions'], canCopy: false })
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) =>
      run({ signal: new AbortController().signal, consumeRetry: async () => undefined }))
    db.project.findFirst.mockResolvedValue({ id: 'p1', storyMeta: completeMeta })
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } })
    db.document.findMany.mockResolvedValue([])
    build.mockResolvedValue({ text: 'Ada muere.', sources, directed: false })
    complete.mockResolvedValue({
      content: JSON.stringify({ tags: ['Angst', 'Dead Dove: Do Not Eat', 'Major Character Death'] }),
      provider: 'balanced',
      model: 'test-model',
    })
  })

  it('refuses empty manuscripts without quota or a provider call', async () => {
    await expect(suggestTags('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })

  it('refuses tiny manuscripts before contacting the model', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 12 } })
    await expect(suggestTags('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
  })

  it('suggests on a complete wizard and drops tags already stored', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    const result = await suggestTags('p1', 'u1', { locale: 'es' })
    expect(result.tags).toEqual(['Dead Dove: Do Not Eat', 'Major Character Death'])
    const system = complete.mock.calls[0][0].messages[0].content as string
    expect(system).toContain(TAG_STYLE_MARKER)
    expect(complete.mock.calls[0][0].messages[1].content).toContain('Angst')
  })
})
