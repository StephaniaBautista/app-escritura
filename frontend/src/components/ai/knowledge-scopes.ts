import type { AiCapabilities } from '@/types/ai'

export type KnowledgeScopeType = 'chapter' | 'subpage'

export interface KnowledgeScope {
  id: string
  title: string
  type: KnowledgeScopeType
  depth: number
}

type Page = AiCapabilities['pages'][number]

export function knowledgeScopes(pages: Page[]): KnowledgeScope[] {
  const children = new Map<string, Page[]>()
  for (const page of pages) {
    if (!page.parentId) continue
    const siblings = children.get(page.parentId)
    if (siblings) siblings.push(page)
    else children.set(page.parentId, [page])
  }

  const scopes: KnowledgeScope[] = []
  const seen = new Set<string>()
  const walk = (page: Page, depth: number) => {
    if (seen.has(page.id)) return
    seen.add(page.id)
    const type = page.type === 'chapter' || page.type === 'subpage' ? page.type : null
    if (type) scopes.push({ id: page.id, title: page.title, type, depth })
    for (const child of children.get(page.id) ?? []) walk(child, type ? depth + 1 : depth)
  }

  for (const page of pages) if (!page.parentId) walk(page, 0)
  for (const page of pages) walk(page, 0)
  return scopes
}
