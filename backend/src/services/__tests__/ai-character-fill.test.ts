import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, authorize, quota, complete, build } = vi.hoisted(() => ({
  db: {
    project: { findFirst: vi.fn() },
    document: { aggregate: vi.fn(), findMany: vi.fn() },
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
vi.mock('../character-option-service.js', () => ({
  characterOptionService: {
    listByType: vi.fn().mockResolvedValue([
      { value: 'Heterosexual' }, { value: 'Homosexual' }, { value: 'Bisexual' }, { value: 'Pansexual' }, { value: 'Asexual' },
    ]),
  },
}))

import { fillCharacters } from '../ai-character-fill.js'

const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'Ada tiene treinta años y vive en Madrid.' }]

describe('character fill generation gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorize.mockResolvedValue({ permissions: ['ai_characters'], canCopy: false })
    quota.mockImplementation((_userId: string, run: (budget: { signal: AbortSignal; consumeRetry: () => Promise<void> }) => Promise<unknown>) =>
      run({ signal: new AbortController().signal, consumeRetry: async () => undefined }))
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    db.character.findMany.mockResolvedValue([])
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } })
    db.document.findMany.mockResolvedValue([])
    build.mockResolvedValue({ text: 'Ada tiene treinta años.', sources, directed: false })
    complete.mockResolvedValue({
      content: JSON.stringify({ characters: [{ name: 'Ada', description: 'Vive en Madrid.', age: 'treinta años' }] }),
      provider: 'balanced',
      model: 'test-model',
    })
  })

  it('refuses empty manuscripts without quota or a provider call', async () => {
    await expect(fillCharacters('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_EMPTY', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
  })

  it('refuses tiny manuscripts before contacting the model', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 12 } })
    await expect(fillCharacters('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT', statusCode: 422 })
    expect(complete).not.toHaveBeenCalled()
    expect(quota).not.toHaveBeenCalled()
  })

  it('creates named characters from document evidence without persisting', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    const result = await fillCharacters('p1', 'u1', { locale: 'es' })
    expect(result.characters[0]).toMatchObject({ name: 'Ada', description: 'Vive en Madrid.' })
    expect(db.character.findMany).toHaveBeenCalled()
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('drops names already stored when creating', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.character.findMany.mockResolvedValue([{ id: 'c1', name: 'Ada', description: null, age: null, gender: null, species: null, birthPlace: null, role: null, attributes: {} }])
    await expect(fillCharacters('p1', 'u1', {})).rejects.toMatchObject({ code: 'AI_WIZARD_INSUFFICIENT' })
  })

  it('completes only empty fields of an owned character', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.character.findMany.mockResolvedValue([{
      id: 'c1', name: 'Ada', description: 'Ya hay ficha.', age: null, gender: null, species: null, birthPlace: null, role: null, attributes: {},
    }])
    complete.mockResolvedValue({
      content: JSON.stringify({ characters: [{ name: 'Ada', description: 'No debe aplicar', age: 'treinta años' }] }),
      provider: 'balanced',
      model: 'test-model',
    })
    const result = await fillCharacters('p1', 'u1', { characterId: 'c1', locale: 'es' })
    expect(result.characters[0]?.name).toBe('Ada')
    expect(result.characters[0]?.age).toBe('treinta años')
    expect(result.characters[0]?.description).toBeUndefined()
  })

  it('asks the model for orientation and keeps a catalog value', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    complete.mockResolvedValue({
      content: JSON.stringify({ characters: [{ name: 'Ada', orientation: 'lesbiana' }] }),
      provider: 'balanced',
      model: 'test-model',
    })
    const result = await fillCharacters('p1', 'u1', { locale: 'es' })
    expect(result.characters[0]?.orientation).toBe('Homosexual')
    const system = complete.mock.calls[0][0].messages[0].content as string
    expect(system).toContain('orientation')
    expect(system).toContain('Heterosexual,Homosexual,Bisexual,Pansexual,Asexual')
  })

  it('does not generate when every fillable field is already present', async () => {
    db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 400 } })
    db.character.findMany.mockResolvedValue([{
      id: 'c1', name: 'Ada', description: 'd', age: '30', gender: 'm', orientation: 'Heterosexual', species: 'h', birthPlace: 'Madrid', role: 'p',
      attributes: { motivations: 'a', weaknesses: 'b', internalConflict: 'c', personality: 'd', virtues: 'e', flaws: 'f', jobStudies: 'g', clothing: 'h', skills: 'i', health: 'j', hobbies: 'k', extraData: 'l' },
    }])
    await expect(fillCharacters('p1', 'u1', { characterId: 'c1' })).rejects.toMatchObject({ code: 'AI_CHARACTER_COMPLETE', statusCode: 409 })
    expect(complete).not.toHaveBeenCalled()
  })
})
