import type { DocumentNode } from '@/types/document'

export interface RelatedDocumentOption {
  id: string
  name: string
  type: DocumentNode['type']
}

function childrenByParent(nodes: readonly DocumentNode[]): Map<string, DocumentNode[]> {
  const map = new Map<string, DocumentNode[]>()
  for (const node of nodes) {
    const key = node.parentId ?? ''
    const list = map.get(key) ?? []
    list.push(node)
    map.set(key, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  }
  return map
}

export function flattenRelatedDocuments(nodes: readonly DocumentNode[]): RelatedDocumentOption[] {
  if (nodes.length === 0) return []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = childrenByParent(nodes)
  const ids = new Set(nodes.map((n) => n.id))
  const roots = nodes
    .filter((n) => !n.parentId || !ids.has(n.parentId))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

  const result: RelatedDocumentOption[] = []
  const visited = new Set<string>()

  const visit = (node: DocumentNode, path: string[]) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    const nextPath = [...path, node.title]
    result.push({
      id: node.id,
      name: nextPath.join(' / '),
      type: node.type,
    })
    for (const child of children.get(node.id) ?? []) {
      if (byId.has(child.id)) visit(child, nextPath)
    }
  }

  for (const root of roots) visit(root, [])
  for (const node of nodes) {
    if (!visited.has(node.id)) visit(node, [])
  }
  return result
}

export function relatedDocumentTitle(
  options: readonly RelatedDocumentOption[],
  id: string,
  fallback: string,
): string {
  return options.find((opt) => opt.id === id)?.name ?? fallback
}
