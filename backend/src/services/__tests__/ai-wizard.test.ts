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
  aiClient: { complete, status: () => ({ providers: [{ id: 'deepseek', available: true }], fallbackEnabled: false }) },
}))
vi.mock('../../lib/rag-service.js', () => ({ ragService: { build } }))

import { completeWizard } from '../ai-wizard.js'
import { TAG_STYLE_MARKER } from '../ai-tag-style.js'

const project = { id: 'p1', description: null, storyMeta: {} }
const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'Ada tiene treinta años y vive en Madrid.' }]

describe('wizard completion generation gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorize.mockResolvedValue({ permissions: ['ai_suggestions'], canCopy: false })
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) =>
      run({ signal: new AbortController().signal, consumeRetry: async () => undefined }))
    db.project.findFirst.mockResolvedValue(project)
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } })
    db.document.findMany.mockResolvedValue([])
    build.mockResolvedValue({ text: 'Ada tiene treinta años.', sources, directed: false })
    complete.mockResolvedValue({
      content: JSON.stringify({ description: 'Ada vive en Madrid.' }),
      provider: 'deepseek',
      model: 'test-model',
    })
  })

  it('rejects a missing stage before contacting the model', async () => {
    await expect(completeWizard('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_INVALID_INPUT', statusCode: 400 })
    expect(complete).not.toHaveBeenCalled()
  })

  it('refuses empty manuscripts without quota or a provider call', async () => {
    await expect(completeWizard('p1', 'u1', { stage: 'description' })).rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
  })

  it('refuses tiny manuscripts before contacting the model', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 12 } })
    await expect(completeWizard('p1', 'u1', { stage: 'description' })).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })

  it('asks basics for type even when other wizard fields are already filled', async () => {
    db.project.findFirst.mockResolvedValue({
      id: 'p1', description: 'Ada vive en Madrid.', storyMeta: { characters: [{ name: 'Ada' }] },
    })
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({
      content: JSON.stringify({ type: ['Romance'], rating: 'teen', isFanfic: false }),
      provider: 'deepseek',
      model: 'test-model',
    })
    const result = await completeWizard('p1', 'u1', { stage: 'basics', locale: 'es' })
    expect(result.meta).toEqual({ type: ['Romance'], rating: 'teen', isFanfic: false })
    const system = complete.mock.calls[0][0].messages[0].content as string
    const user = complete.mock.calls[0][0].messages[1].content as string
    expect(system).toContain('type')
    expect(user).toContain('Stage basics')
    expect(user).not.toContain('Stage description')
  })

  it('asks couples for ships even when the story is not marked romance', async () => {
    db.project.findFirst.mockResolvedValue({
      id: 'p1', description: 'Ada y Bea.', storyMeta: { type: ['Drama'], isFanfic: false },
    })
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({
      content: JSON.stringify({ ships: ['Ada/Bea'], categories: ['F/F'] }),
      provider: 'deepseek',
      model: 'test-model',
    })
    const result = await completeWizard('p1', 'u1', { stage: 'couples', locale: 'es' })
    expect(result.meta).toEqual({ ships: ['Ada/Bea'], categories: ['F/F'] })
    const system = complete.mock.calls[0][0].messages[0].content as string
    expect(system).toContain('ships')
    expect(system).toContain('among categories,ships')
  })

  it('returns suggestions instead of overwriting a solid stage', async () => {
    db.project.findFirst.mockResolvedValue({
      id: 'p1',
      description: 'Ada vive en Madrid.',
      storyMeta: { rating: 'teen', type: ['Drama', 'Romance'], isFanfic: false },
    })
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({
      content: JSON.stringify({
        complete: { type: ['Mystery'] },
        suggestions: [{
          field: 'type', title: 'Añade misterio', description: 'Hay una investigación.', value: ['Drama', 'Romance', 'Mystery'],
        }],
      }),
      provider: 'deepseek',
      model: 'test-model',
    })
    const result = await completeWizard('p1', 'u1', { stage: 'basics', locale: 'es' })
    expect(result.meta).toEqual({})
    expect(result.suggestions).toEqual([
      { field: 'type', title: 'Añade misterio', description: 'Hay una investigación.', value: ['Drama', 'Romance', 'Mystery'] },
    ])
  })

  it('accepts a second stage call after a first fill', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    const first = await completeWizard('p1', 'u1', { locale: 'es', stage: 'description' })
    expect(first.description).toBe('Ada vive en Madrid.')
    db.project.findFirst.mockResolvedValue({
      id: 'p1', description: 'Ada vive en Madrid.', storyMeta: {},
    })
    complete.mockResolvedValue({
      content: JSON.stringify({ type: ['Romance'] }),
      provider: 'deepseek',
      model: 'test-model',
    })
    const second = await completeWizard('p1', 'u1', { locale: 'es', stage: 'basics' })
    expect(second.meta).toEqual({ type: ['Romance'] })
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('includes structure and tag guidance only on those stages', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({
      content: JSON.stringify({ structure: { sections: [{ id: 'inicio', answers: { 'wizard:inicio:status': 'Madrid' } }] } }),
      provider: 'deepseek',
      model: 'test-model',
    })
    await completeWizard('p1', 'u1', { locale: 'es', stage: 'structure' })
    expect(complete.mock.calls[0][0].messages[0].content).toContain('wizard:desarrollo:inciting')
    complete.mockResolvedValue({
      content: JSON.stringify({ tags: ['Angst'] }),
      provider: 'deepseek',
      model: 'test-model',
    })
    await completeWizard('p1', 'u1', { locale: 'es', stage: 'tags' })
    expect(complete.mock.calls[1][0].messages[0].content).toContain(TAG_STYLE_MARKER)
  })

  it('treats an empty model fill as insufficient after generation', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({ content: '{}', provider: 'deepseek', model: 'test-model' })
    await expect(completeWizard('p1', 'u1', { stage: 'description' })).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT' })
  })
})
