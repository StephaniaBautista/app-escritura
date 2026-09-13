import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() }, document: { findMany: vi.fn() }, character: { findFirst: vi.fn(), findMany: vi.fn() },
    world: { findMany: vi.fn() }, loreEntry: { findMany: vi.fn() }, race: { findMany: vi.fn() }, glossaryEntry: { findMany: vi.fn() }, creature: { findMany: vi.fn() }, location: { findMany: vi.fn() }, worldRoute: { findMany: vi.fn() }, timelineEvent: { findMany: vi.fn() }, timelineEra: { findMany: vi.fn() }, characterRelationship: { findMany: vi.fn() }, subplot: { findMany: vi.fn() }, structureBoard: { findMany: vi.fn() },
  },
}))

vi.mock('../prisma.js', () => ({ prisma: prismaMock }))
import { ragService } from '../rag-service.js'

const text = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })
const document = (id: string, type: string, parentId: string | null, order: number, content: string) => ({ id, title: id, type, parentId, order, content: text(content) })
const baseInput = { projectId: 'project-1', userId: 'user-1', query: 'Alba' }
const root = document('root', 'document', null, 0, 'Root metadata with a future betrayal')
const chapter1 = document('chapter-1', 'chapter', 'root', 0, 'Alba es amable. Alba tiene diecisiete años. Alba llega a la plaza.')
const page1 = document('page-1', 'subpage', 'chapter-1', 70, 'Alba se reúne con Bruno.')
const chapter2 = document('chapter-2', 'chapter', 'root', 1, 'Alba descubre que Bruno es su hermano secreto.')
const character = { id: 'alba', name: 'Alba', description: 'Alba es la reina secreta y Bruno morirá.', nicknames: [], age: 'diecisiete años', gender: 'femenino', attributes: { personality: 'amable', skills: 'controla la muerte' }, evolvesFromId: null, storyPoint: 'inicio' }

function setDocuments(rows = [root, chapter1, page1, chapter2]) {
  prismaMock.document.findMany.mockImplementation(async (query: { select: { content?: boolean }; where: { id?: { in: string[] } } }) => query.select.content ? rows.filter((row) => query.where.id?.in.includes(row.id)) : rows.map(({ content: _content, ...row }) => row))
}

describe('ragService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1', name: 'Historia de Alba', description: 'Todos mueren al final', storyMeta: { guidedMode: true, ending: 'Un final secreto' } })
    setDocuments()
    prismaMock.character.findFirst.mockResolvedValue(character)
    for (const [name, model] of Object.entries(prismaMock)) {
      if (name !== 'document' && 'findMany' in model) model.findMany.mockResolvedValue([])
    }
  })

  it('does not query any project content without ownership', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)
    expect(await ragService.build(baseInput)).toBeNull()
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'project-1', userId: 'user-1' } }))
    expect(prismaMock.document.findMany).not.toHaveBeenCalled()
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
  })

  it('refreshes current content on every request and scopes every retrieval by ownership', async () => {
    const first = await ragService.build(baseInput)
    expect(first?.text).toContain('diecisiete años')
    setDocuments([root, { ...chapter1, content: text('Alba tiene dieciocho años ahora.') }])
    const second = await ragService.build(baseInput)
    expect(second?.text).toContain('dieciocho años ahora')
    expect(second?.text).not.toContain('diecisiete años')
    expect(second?.directed).toBe(true)
    for (const [query] of prismaMock.document.findMany.mock.calls) expect(query.where).toMatchObject({ projectId: 'project-1', userId: 'user-1', project: { userId: 'user-1' } })
    expect(prismaMock.loreEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 'project-1', project: { userId: 'user-1' } }, take: 100 }))
  })

  it('includes the complete writing page when pageMode is on', async () => {
    const page = document('page-long', 'subpage', 'chapter-1', 80, `${'Ada camina por el puerto. '.repeat(40)}El barco ya no está.`)
    setDocuments([root, chapter1, page])
    const result = await ragService.build({ ...baseInput, pageMode: true, query: 'barco' })
    const excerpt = result?.sources.find((item) => item.id === 'document:page-long')?.excerpt ?? ''
    expect(excerpt).toContain('Ada camina por el puerto.')
    expect(excerpt).toContain('El barco ya no está.')
    expect(excerpt).not.toContain('[...]')
  })

  it('uses a bounded unsaved draft only for the owned document and never persists it', async () => {
    const result = await ragService.build({ ...baseInput, documentId: 'chapter-1', draftContent: 'Alba acaba de cumplir veinte años.' })
    expect(result?.text).toContain('veinte años')
    expect(result?.text).not.toContain('diecisiete años')
    expect(result?.sources.find((item) => item.id === 'document:chapter-1')?.excerpt).toContain('veinte años')
  })

  it('rejects foreign drafts and malformed context parameters', async () => {
    expect(await ragService.build({ ...baseInput, documentId: 'foreign', draftContent: 'Spoiler' })).toBeNull()
    await expect(ragService.build({ ...baseInput, draftContent: 'No document' })).rejects.toMatchObject({ code: 'AI_INVALID_CONTEXT' })
    await expect(ragService.build({ ...baseInput, documentId: 'chapter-1', draftContent: 'x'.repeat(56_001) })).rejects.toMatchObject({ code: 'AI_INVALID_CONTEXT' })
  })

  it('includes characters, lore, timeline, relationships, worldbuilding, map, structure and subplots as sources', async () => {
    prismaMock.character.findMany.mockResolvedValue([character])
    prismaMock.world.findMany.mockResolvedValue([{ id: 'w', name: 'Mundo', content: { summary: 'Reinos en conflicto' } }])
    prismaMock.loreEntry.findMany.mockResolvedValue([{ id: 'l', name: 'Magia', limits: 'Solo al amanecer' }])
    prismaMock.race.findMany.mockResolvedValue([{ id: 'r', name: 'Elfos', culture: 'Cantos' }])
    prismaMock.glossaryEntry.findMany.mockResolvedValue([{ id: 'g', word: 'Solan', meaning: 'Luz' }])
    prismaMock.creature.findMany.mockResolvedValue([{ id: 'c', name: 'Dragón', description: 'Azul' }])
    prismaMock.location.findMany.mockResolvedValue([{ id: 'p', name: 'Puerto', description: 'Norte' }])
    prismaMock.worldRoute.findMany.mockResolvedValue([{ id: 'route', label: 'Camino', locationA: { name: 'Puerto', projectId: 'project-1' }, locationB: { name: 'Plaza', projectId: 'project-1' } }])
    prismaMock.timelineEvent.findMany.mockResolvedValue([{ id: 't', title: 'Encuentro', description: 'Alba llega' }])
    prismaMock.characterRelationship.findMany.mockResolvedValue([{ id: 'rel', type: 'friendship', characterA: { name: 'Alba', projectId: 'project-1' }, characterB: { name: 'Bruno', projectId: 'project-1' } }])
    prismaMock.subplot.findMany.mockResolvedValue([{ id: 's', title: 'El viaje', description: 'Encontrar un mapa' }])
    prismaMock.structureBoard.findMany.mockResolvedValue([{ id: 'b', name: 'Acto I', columns: [{ name: 'Inicio', cards: [{ title: 'El encuentro' }] }] }])
    const result = await ragService.build(baseInput)
    expect(new Set(result?.sources.map((item) => item.type))).toEqual(new Set(['document', 'character', 'world', 'lore', 'race', 'glossary', 'creature', 'location', 'route', 'timeline', 'relationship', 'subplot', 'structure', 'project']))
  })

  it('does not leak names across malformed cross-project map or character relations', async () => {
    prismaMock.worldRoute.findMany.mockResolvedValue([{ id: 'route', locationA: { name: 'FOREIGN SECRET', projectId: 'project-2' }, locationB: { name: 'Plaza', projectId: 'project-1' } }])
    prismaMock.characterRelationship.findMany.mockResolvedValue([{ id: 'rel', characterA: { name: 'FOREIGN SECRET', projectId: 'project-2' }, characterB: { name: 'Bruno', projectId: 'project-1' } }])
    expect((await ragService.build(baseInput))?.text).not.toContain('FOREIGN SECRET')
  })

  it('resolves family and timeline identifiers only to scoped fictional names', async () => {
    prismaMock.character.findMany.mockResolvedValue([character, { ...character, id: 'bruno', name: 'Bruno', parentIds: ['alba', 'foreign-parent'] }])
    prismaMock.timelineEra.findMany.mockResolvedValue([{ id: 'era', name: 'Edad dorada', startDate: '1', endDate: '20' }])
    prismaMock.timelineEvent.findMany.mockResolvedValue([{ id: 'event', title: 'Llegada', eraId: 'era', characterIds: ['alba', 'foreign-character'] }])
    const result = await ragService.build(baseInput)
    expect(result?.sources.find((item) => item.id === 'relationship:parent:bruno:alba')?.excerpt).toContain('parent: Alba')
    expect(result?.sources.find((item) => item.id === 'timeline:event')?.excerpt).toContain('era: Edad dorada')
    expect(result?.sources.find((item) => item.id === 'timeline:event')?.excerpt).toContain('characters: Alba')
    expect(result?.text).not.toContain('foreign-parent')
    expect(result?.text).not.toContain('foreign-character')
  })

  it('restricts character knowledge to actual prior chapters and corroborated profile facts', async () => {
    const result = await ragService.build({ ...baseInput, mode: 'character', characterId: 'alba', chapterId: 'chapter-1' })
    expect(result?.characterName).toBe('Alba')
    expect(result?.text).toContain('amable')
    expect(result?.text).toContain('diecisiete años')
    expect(result?.text).toContain('se reúne con Bruno')
    for (const spoiler of ['hermano secreto', 'reina secreta', 'controla la muerte', 'Todos mueren', 'final secreto', 'future betrayal']) expect(result?.text).not.toContain(spoiler)
    expect(prismaMock.world.findMany).not.toHaveBeenCalled()
    expect(prismaMock.timelineEvent.findMany).not.toHaveBeenCalled()
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
    const contentQueries = prismaMock.document.findMany.mock.calls.filter(([query]) => query.select.content)
    expect(contentQueries[0][0].where.id.in).toEqual(['chapter-1', 'page-1'])
  })

  it('ignores unsaved character drafts and includes later knowledge only after raising the chapter limit', async () => {
    const first = await ragService.build({ ...baseInput, mode: 'character', characterId: 'alba', chapterId: 'chapter-1', documentId: 'chapter-1', draftContent: 'PRIVATE FUTURE DRAFT' })
    expect(first?.text).not.toContain('PRIVATE FUTURE DRAFT')
    const second = await ragService.build({ ...baseInput, mode: 'character', characterId: 'alba', chapterId: 'chapter-2' })
    expect(second?.text).toContain('hermano secreto')
  })

  it('resolves a selected evolution to the base identity without using future evolution metadata', async () => {
    prismaMock.character.findFirst.mockResolvedValueOnce({ ...character, id: 'future-alba', name: 'Alba Reina', evolvesFromId: 'alba', attributes: { personality: 'asesina' } }).mockResolvedValueOnce(character)
    const result = await ragService.build({ ...baseInput, mode: 'character', characterId: 'future-alba', chapterId: 'chapter-1' })
    expect(result?.characterName).toBe('Alba')
    expect(result?.text).not.toContain('Alba Reina')
    expect(result?.text).not.toContain('asesina')
  })

  it('requires owned characters and a real chapter boundary', async () => {
    await expect(ragService.build({ ...baseInput, mode: 'character', characterId: 'alba' })).rejects.toMatchObject({ code: 'AI_INVALID_CONTEXT' })
    expect(await ragService.build({ ...baseInput, mode: 'character', characterId: 'alba', chapterId: 'root' })).toBeNull()
    expect(await ragService.build({ ...baseInput, mode: 'character', characterId: 'alba', chapterId: 'foreign' })).toBeNull()
    prismaMock.character.findFirst.mockResolvedValue(null)
    expect(await ragService.build({ ...baseInput, mode: 'character', characterId: 'foreign', chapterId: 'chapter-1' })).toBeNull()
  })

  it('fails closed if a project is too large to validate its chapter hierarchy', async () => {
    setDocuments(Array.from({ length: 401 }, (_, index) => document(String(index), 'chapter', null, index, 'text')))
    await expect(ragService.build(baseInput)).rejects.toMatchObject({ code: 'AI_CONTEXT_TOO_LARGE', statusCode: 413 })
  })
})
