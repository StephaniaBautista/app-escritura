import { prisma } from './prisma.js'
import { assembleContext, documentContextText, documentsThroughChapter, focusedPageText, FOCUSED_PAGE_CHARS, narrativeFields, source, type AiSource, type RagContext } from './rag-context.js'
import { worldContext } from './rag-world-context.js'

export type { AiSource, RagContext } from './rag-context.js'

export interface RagInput {
  projectId: string
  userId: string
  query: string
  mode?: 'adviser' | 'character'
  characterId?: string
  chapterId?: string
  documentId?: string
  draftContent?: string
  pageMode?: boolean
}

export class RagContextError extends Error {
  constructor(public readonly code: 'AI_CONTEXT_TOO_LARGE' | 'AI_INVALID_CONTEXT', public readonly statusCode: number) {
    super(code)
    this.name = 'RagContextError'
  }
}

const MAX_DOCUMENTS = 400
const CHARACTER_SELECT = {
  id: true, name: true, description: true, nicknames: true, age: true, gender: true, heightCm: true,
  orientation: true, maritalStatus: true, species: true, birthPlace: true, birthDate: true, role: true,
  roleSpec: true, attributes: true, parentIds: true, evolvesFromId: true, evolutionReason: true, storyPoint: true,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function supportedProfile(value: unknown, evidence: string): Record<string, string> {
  if (!isRecord(value)) return {}
  const fields: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (['description', 'evolutionReason', 'storyPoint', 'evolvesFromId', 'id', 'name'].includes(key)) continue
    if (typeof item === 'string' && item.length > 3 && evidence.includes(item.toLowerCase())) fields[key] = item
    if (key === 'attributes' && isRecord(item)) {
      for (const [attribute, text] of Object.entries(item)) {
        if (typeof text === 'string' && text.length > 3 && evidence.includes(text.toLowerCase())) fields[attribute] = text
      }
    }
  }
  return fields
}

export const ragService = {
  async build(input: RagInput): Promise<RagContext | null> {
    if (input.draftContent !== undefined && (typeof input.draftContent !== 'string' || input.draftContent.length > FOCUSED_PAGE_CHARS || !input.documentId)) {
      throw new RagContextError('AI_INVALID_CONTEXT', 400)
    }
    const characterMode = input.mode === 'character'
    if (characterMode && (!input.characterId || !input.chapterId)) throw new RagContextError('AI_INVALID_CONTEXT', 400)
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId: input.userId },
      select: { id: true, name: true, description: true, storyMeta: true },
    })
    if (!project) return null
    const directed = isRecord(project.storyMeta) && project.storyMeta.guidedMode === true
    const scope = { projectId: input.projectId, project: { userId: input.userId }, userId: input.userId }
    const documents = await prisma.document.findMany({
      where: scope,
      select: { id: true, title: true, type: true, parentId: true, order: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: MAX_DOCUMENTS + 1,
    })
    if (documents.length > MAX_DOCUMENTS) throw new RagContextError('AI_CONTEXT_TOO_LARGE', 413)
    const allowedDocuments = characterMode ? documentsThroughChapter(documents, input.chapterId!) : documents
    if (!allowedDocuments || (input.documentId && !allowedDocuments.some((document) => document.id === input.documentId))) return null
    const candidates: AiSource[] = []
    for (let index = 0; index < allowedDocuments.length; index += 20) {
      const selected = allowedDocuments.slice(index, index + 20)
      const content = await prisma.document.findMany({
        where: { ...scope, id: { in: selected.map((document) => document.id) } },
        select: { id: true, title: true, content: true },
        take: 20,
      })
      const byId = new Map(content.map((document) => [document.id, document]))
      for (const metadata of selected) {
        const document = byId.get(metadata.id)
        if (!document) continue
        const completePage = !characterMode && (input.pageMode === true || input.documentId === document.id)
        const persisted = completePage ? focusedPageText(document.content) : documentContextText(document.content, input.query)
        const draft = !characterMode && input.documentId === document.id ? input.draftContent : undefined
        const text = draft === undefined
          ? persisted
          : draft.length >= persisted.length || !persisted.startsWith(draft) ? draft : persisted
        if (text.trim()) candidates.push({ id: `document:${document.id}`, type: 'document', title: document.title.slice(0, 180), excerpt: text })
      }
    }
    if (characterMode) {
      const selectedCharacter = await prisma.character.findFirst({ where: { id: input.characterId, projectId: input.projectId, project: { userId: input.userId } }, select: CHARACTER_SELECT })
      if (!selectedCharacter) return null
      let character = selectedCharacter
      const visited = new Set<string>()
      while (character.evolvesFromId) {
        if (visited.has(character.id) || visited.size > 30) throw new RagContextError('AI_INVALID_CONTEXT', 400)
        visited.add(character.id)
        const parent: typeof selectedCharacter | null = await prisma.character.findFirst({ where: { id: character.evolvesFromId, projectId: input.projectId, project: { userId: input.userId } }, select: CHARACTER_SELECT })
        if (!parent) return null
        character = parent
      }
      const evidence = candidates.map((item) => item.excerpt).join('\n').toLowerCase()
      candidates.unshift(source('character', input.characterId!, character.name, { name: character.name, verifiedFacts: supportedProfile(character, evidence) }))
      return assembleContext(candidates, `${character.name} ${input.query}`, false, character.name)
    }
    const characters = await prisma.character.findMany({
      where: { projectId: input.projectId, project: { userId: input.userId } },
      select: CHARACTER_SELECT,
      orderBy: { id: 'asc' }, take: 200,
    })
    candidates.push(...characters.map((character) => source('character', character.id, character.name, character)))
    const characterNames = new Map(characters.map((character) => [character.id, character.name]))
    for (const character of characters) {
      for (const parentId of character.parentIds ?? []) {
        const parentName = characterNames.get(parentId)
        if (parentName) candidates.push(source('relationship', `parent:${character.id}:${parentId}`, `${parentName} – ${character.name}`, { parent: parentName, child: character.name }))
      }
    }
    candidates.push(...await worldContext(input.projectId, input.userId, characterNames))
    candidates.push(source('project', project.id, project.name, { description: project.description, metadata: narrativeFields(project.storyMeta) }))
    return assembleContext(candidates, input.query, directed, undefined, input.documentId, { pageMode: input.pageMode === true })
  },
}
