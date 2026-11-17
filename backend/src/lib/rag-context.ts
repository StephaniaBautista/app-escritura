export type AiSourceType = 'project' | 'document' | 'character' | 'relationship' | 'timeline' | 'world' | 'lore' | 'race' | 'glossary' | 'creature' | 'location' | 'route' | 'subplot' | 'structure'

export interface AiSource {
  id: string
  type: AiSourceType
  title: string
  excerpt: string
}

export interface RagContext {
  text: string
  sources: AiSource[]
  characterName?: string
  directed: boolean
}

export interface ContextDocument {
  id: string
  title: string
  type: string
  parentId: string | null
  order: number
}

export const MAX_CONTEXT_CHARS = 28_000
export const MAX_PAGE_CONTEXT_CHARS = 56_000
export const ADVISER_RETRIEVAL_CHARS = 30_000
export const MAX_DOCUMENT_TEXT_CHARS = 24_000
export const FOCUSED_PAGE_CHARS = 56_000
export const LONG_DOCUMENT_CHARS = 2_000_000
export const LONG_MANUSCRIPT_WORDS = 8_000
const CHUNK_CHARS = 1800
const MAX_NODE_VISITS = 250_000
const SPREAD_DOCUMENTS = 12
const CHUNKS_PER_SOURCE = 8

export function manuscriptSpread(words: number): { pageMode: boolean; spread: boolean } {
  const long = words >= LONG_MANUSCRIPT_WORDS
  return { pageMode: !long, spread: long }
}

export function plainDocumentText(value: unknown, limit = MAX_DOCUMENT_TEXT_CHARS): string {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
  const parts: string[] = []
  let length = 0
  let visited = 0
  while (stack.length && length < limit && visited++ < MAX_NODE_VISITS) {
    const item = stack.pop()!
    if (item.depth > 48) continue
    if (!item.value || typeof item.value !== 'object' || Array.isArray(item.value)) continue
    const node = item.value as Record<string, unknown>
    if (node.type === 'text' && typeof node.text === 'string') {
      const text = node.text.slice(0, limit - length)
      parts.push(text)
      length += text.length
    } else if (node.type === 'hardBreak') {
      parts.push('\n')
      length++
    } else if (Array.isArray(node.content)) {
      if (parts.length && ['paragraph', 'heading', 'listItem'].includes(String(node.type))) {
        parts.push('\n')
        length++
      }
      for (let index = Math.min(node.content.length, 20_000) - 1; index >= 0; index--) {
        stack.push({ value: node.content[index], depth: item.depth + 1 })
      }
    }
  }
  return parts.join('').slice(0, limit).trim()
}

export function narrativeFields(value: unknown, depth = 0): string {
  if (depth > 6 || value === null || value === undefined) return ''
  if (typeof value === 'string') return value.slice(0, 5000)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.slice(0, 60).map((item) => narrativeFields(item, depth + 1)).filter(Boolean).join(', ').slice(0, 12_000)
  if (typeof value !== 'object') return ''
  return Object.entries(value).slice(0, 60)
    .filter(([key]) => !/(?:ids?$|url|image|password|email|token|secret|createdAt|updatedAt)/i.test(key))
    .map(([key, item]) => {
      const text = narrativeFields(item, depth + 1)
      return text ? `${key}: ${text}` : ''
    }).filter(Boolean).join('\n').slice(0, 20_000)
}

export function source(type: AiSourceType, id: string, title: string, data: unknown): AiSource {
  return { id: `${type}:${id}`, type, title: title.slice(0, 180), excerpt: narrativeFields(data) }
}

const KNOWLEDGE_SCOPE_TYPES = new Set(['chapter', 'subpage'])

export function documentsThroughScope(documents: ContextDocument[], scopeId: string): ContextDocument[] | null {
  const selected = documents.find((document) => document.id === scopeId && KNOWLEDGE_SCOPE_TYPES.has(document.type))
  if (!selected) return null
  const byId = new Map(documents.map((document) => [document.id, document]))
  const parents = new Set<string>()
  let root = selected
  while (root.parentId) {
    if (parents.has(root.id)) return null
    parents.add(root.id)
    const parent = byId.get(root.parentId)
    if (!parent) return null
    root = parent
  }
  if (root.type !== 'document') return null
  const children = new Map<string, ContextDocument[]>()
  for (const document of documents) {
    if (!document.parentId) continue
    const siblings = children.get(document.parentId) ?? []
    siblings.push(document)
    children.set(document.parentId, siblings)
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const ordered: ContextDocument[] = []
  const seen = new Set<string>()
  let reached = false
  function visit(document: ContextDocument, insideSelected: boolean) {
    if (seen.has(document.id) || (reached && !insideSelected)) return
    seen.add(document.id)
    if (document.id === selected!.id) reached = true
    if (document.type !== 'document') ordered.push(document)
    for (const child of children.get(document.id) ?? []) visit(child, insideSelected || document.id === selected!.id)
  }
  visit(root, false)
  return reached ? ordered : null
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function queryTerms(query: string): string[] {
  const ignored = new Set(['para', 'como', 'esta', 'esto', 'este', 'that', 'this', 'with', 'from', 'what', 'which', 'about'])
  return [...new Set(normalized(query).match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter((term) => !ignored.has(term)).slice(0, 32)
}

export function focusedPageText(value: unknown): string {
  return plainDocumentText(value, FOCUSED_PAGE_CHARS)
}

export function documentContextText(value: unknown, query: string, complete = false): string {
  if (complete) return focusedPageText(value)
  const text = plainDocumentText(value, LONG_DOCUMENT_CHARS)
  if (text.length <= MAX_DOCUMENT_TEXT_CHARS) return text
  return sampleDocumentText(text, query, MAX_DOCUMENT_TEXT_CHARS)
}

export interface AssembleOptions {
  pageMode?: boolean
  spread?: boolean
  budget?: number
}

function sampleDocumentText(text: string, query: string, limit: number): string {
  const terms = queryTerms(query)
  const scanned = scanOffsets(text.length).map((offset) => {
    const excerpt = text.slice(offset, offset + CHUNK_CHARS)
    const searchable = normalized(excerpt)
    return { text: excerpt, offset, score: terms.filter((term) => searchable.includes(term)).length }
  })
  const selected = pickScoredChunks(scanned, 13)
  return selected.sort((a, b) => a.offset - b.offset).map((chunk) => chunk.text).join('\n[...]\n').slice(0, limit)
}

function scanOffsets(length: number): number[] {
  if (length <= CHUNK_CHARS) return [0]
  const step = Math.max(CHUNK_CHARS - 180, Math.ceil((length - CHUNK_CHARS) / (CHUNKS_PER_SOURCE - 1)))
  const offsets: number[] = []
  for (let offset = 0; offset < length; offset += step) {
    offsets.push(offset)
    if (offsets.length >= CHUNKS_PER_SOURCE - 1) break
  }
  const tail = Math.max(0, length - CHUNK_CHARS)
  if (!offsets.includes(tail)) offsets.push(tail)
  return [...new Set(offsets)]
}

function pickScoredChunks<T extends { offset: number; score: number }>(chunks: T[], take: number): T[] {
  if (chunks.length <= take) return chunks
  const byOffset = [...chunks].sort((a, b) => a.offset - b.offset)
  const anchors = [byOffset[0], byOffset[byOffset.length - 1]]
  const ranked = [...chunks].sort((a, b) => b.score - a.score || a.offset - b.offset)
  const chosen = new Map<number, T>()
  for (const chunk of [...anchors, ...ranked]) {
    if (!chunk || chosen.has(chunk.offset)) continue
    chosen.set(chunk.offset, chunk)
    if (chosen.size >= take) break
  }
  return [...chosen.values()]
}

function evenlySpaced<T>(items: T[], take: number): T[] {
  if (items.length <= take) return items
  const picked: T[] = []
  for (let index = 0; index < take; index++) {
    picked.push(items[Math.round((index * (items.length - 1)) / (take - 1))]!)
  }
  return [...new Set(picked)]
}

function sourceChunks(item: AiSource, index: number, terms: string[], focusedId: string) {
  const offsets = scanOffsets(item.excerpt.length)
  return offsets.map((offset) => {
    const excerpt = item.excerpt.slice(offset, offset + CHUNK_CHARS)
    const searchable = normalized(excerpt)
    const title = normalized(item.title)
    const last = offset === offsets[offsets.length - 1]
    const relevance = terms.reduce((score, term) => score + (searchable.includes(term) ? 2 : 0) + (title.includes(term) ? 3 : 0), 0)
    const position = offset === 0 || last ? 2 : 0
    return { item: { ...item, excerpt }, score: relevance + position + (item.id === focusedId ? 5 : 0), index, offset }
  })
}

function encodeContext(prefix: object, sources: AiSource[]): string {
  return JSON.stringify({ ...prefix, sources })
}

function fitSource(prefix: object, source: AiSource, budget: number, selected: AiSource[] = []): AiSource | null {
  const withSource = (excerpt: string) => encodeContext(prefix, [...selected, { ...source, excerpt }])
  if (withSource(source.excerpt).length <= budget) return source
  let low = 0
  let high = source.excerpt.length
  let excerpt = ''
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = source.excerpt.slice(0, mid)
    if (withSource(candidate).length <= budget) {
      excerpt = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return excerpt.trim() ? { ...source, excerpt: excerpt.trimEnd() } : null
}

export function assembleContext(
  candidates: AiSource[], query: string, directed: boolean, characterName?: string, documentId?: string, options?: AssembleOptions,
): RagContext {
  const pageMode = options?.pageMode === true
  const spread = options?.spread === true
  const budget = options?.budget ?? (documentId || pageMode || spread ? MAX_PAGE_CONTEXT_CHARS : MAX_CONTEXT_CHARS)
  const prefix = { kind: 'untrusted_project_context', knowledge: characterName ? 'selected_chapter_only' : 'retrieved_current_project', characterName }
  const selected: AiSource[] = []
  let text = encodeContext(prefix, selected)
  const focusedId = documentId ? `document:${documentId}` : ''
  const intact = new Set<string>()
  if (focusedId) {
    const focused = candidates.find((item) => item.id === focusedId)
    if (focused) {
      const fitted = fitSource(prefix, focused, budget)
      if (fitted) {
        selected.push(fitted)
        intact.add(fitted.id)
        text = encodeContext(prefix, selected)
      }
    }
  }
  if (pageMode && !spread) {
    for (const item of candidates) {
      if (item.type !== 'document' || intact.has(item.id) || selected.length >= 40) continue
      const next = [...selected, item]
      const encoded = encodeContext(prefix, next)
      if (encoded.length > budget) continue
      selected.push(item)
      intact.add(item.id)
      text = encoded
    }
  }
  const terms = queryTerms(query)
  const priority = spread
    ? new Set(evenlySpaced(candidates.filter((item) => item.type === 'document'), SPREAD_DOCUMENTS).map((item) => item.id))
    : null
  const chunks = candidates.flatMap((item, index) => {
    if (intact.has(item.id)) return []
    return sourceChunks(item, index, terms, focusedId).map((chunk) => ({
      ...chunk,
      score: chunk.score + (priority?.has(item.id) ? 4 : 0),
    }))
  }).sort((a, b) => b.score - a.score || a.index - b.index || a.offset - b.offset)
  for (const chunk of chunks) {
    const previous = selected.find((item) => item.id === chunk.item.id)
    const next = previous
      ? selected.map((item) => item.id === chunk.item.id ? { ...item, excerpt: `${item.excerpt}\n[...]\n${chunk.item.excerpt}` } : item)
      : [...selected, chunk.item]
    const encoded = encodeContext(prefix, next)
    if (encoded.length > budget || next.length > 40) continue
    selected.splice(0, selected.length, ...next)
    text = encoded
  }
  return { text, sources: selected, characterName, directed }
}

export function assembleIntactSources(
  candidates: AiSource[],
  directed: boolean,
  options?: { budget?: number; knowledge?: string; characterName?: string },
): RagContext {
  const budget = options?.budget ?? ADVISER_RETRIEVAL_CHARS
  const prefix = {
    kind: 'untrusted_project_context',
    knowledge: options?.knowledge ?? 'retrieved_indexed_subset',
    characterName: options?.characterName,
  }
  const selected: AiSource[] = []
  let text = encodeContext(prefix, selected)
  for (const item of candidates) {
    if (selected.length >= 40) break
    const encoded = encodeContext(prefix, [...selected, item])
    if (encoded.length <= budget) {
      selected.push(item)
      text = encoded
      continue
    }
    const fitted = fitSource(prefix, item, budget, selected)
    if (fitted) {
      selected.push(fitted)
      text = encodeContext(prefix, selected)
    }
    break
  }
  return { text, sources: selected, characterName: options?.characterName, directed }
}
