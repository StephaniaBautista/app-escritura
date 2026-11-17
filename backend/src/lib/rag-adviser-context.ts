import { prisma } from './prisma.js'
import { embeddingsConfigured, embedTexts, EmbeddingError } from './ai-embeddings.js'
import { assembleIntactSources, ADVISER_RETRIEVAL_CHARS, narrativeFields, source, type AiSource, type RagContext } from './rag-context.js'
import { ragIndexService } from './rag-index-service.js'
import { searchSimilarChunks } from './rag-vector-search.js'
import { worldContext } from './rag-world-context.js'

const CHARACTER_SELECT = {
  id: true, name: true, description: true, nicknames: true, age: true, gender: true, heightCm: true,
  orientation: true, maritalStatus: true, species: true, birthPlace: true, birthDate: true, role: true,
  roleSpec: true, attributes: true, parentIds: true, evolvesFromId: true, evolutionReason: true, storyPoint: true,
} as const

const SEARCH_LIMIT = 24

export async function buildAdviserSemanticContext(input: {
  projectId: string
  userId: string
  query: string
  directed: boolean
  project: { id: string; name: string; description: string | null; storyMeta: unknown }
}): Promise<RagContext> {
  if (!embeddingsConfigured()) throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  await ragIndexService.ensureProject(input.projectId, input.userId)
  const [queryEmbedding] = await embedTexts([input.query])
  if (!queryEmbedding) throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  const hits = await searchSimilarChunks({
    projectId: input.projectId,
    userId: input.userId,
    embedding: queryEmbedding,
    limit: SEARCH_LIMIT,
  })
  const documentIds = [...new Set(hits.map((hit) => hit.documentId))]
  const documents = documentIds.length
    ? await prisma.document.findMany({
      where: { id: { in: documentIds }, projectId: input.projectId, userId: input.userId, project: { userId: input.userId } },
      select: { id: true, title: true },
    })
    : []
  const titles = new Map(documents.map((document) => [document.id, document.title]))
  const characters = await prisma.character.findMany({
    where: { projectId: input.projectId, project: { userId: input.userId } },
    select: CHARACTER_SELECT,
    orderBy: { id: 'asc' }, take: 200,
  })
  const candidates: AiSource[] = [
    source('project', input.project.id, input.project.name, { description: input.project.description, metadata: narrativeFields(input.project.storyMeta) }),
    ...characters.map((character) => source('character', character.id, character.name, character)),
  ]
  const characterNames = new Map(characters.map((character) => [character.id, character.name]))
  for (const character of characters) {
    for (const parentId of character.parentIds ?? []) {
      const parentName = characterNames.get(parentId)
      if (parentName) candidates.push(source('relationship', `parent:${character.id}:${parentId}`, `${parentName} – ${character.name}`, { parent: parentName, child: character.name }))
    }
  }
  candidates.push(...await worldContext(input.projectId, input.userId, characterNames))
  for (const hit of hits) {
    const title = titles.get(hit.documentId)
    if (!title) continue
    candidates.push({
      id: `document:${hit.documentId}:${hit.chunkIndex}`,
      type: 'document',
      title: title.slice(0, 180),
      excerpt: hit.content,
    })
  }
  return assembleIntactSources(candidates, input.directed, {
    budget: ADVISER_RETRIEVAL_CHARS,
    knowledge: 'retrieved_indexed_subset',
  })
}
