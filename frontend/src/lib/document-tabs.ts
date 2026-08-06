import type { DocumentNode } from '@/types/document'

export function getDocumentRootId(tree: DocumentNode[], docId: string): string | null {
  const byId = new Map(tree.map((d) => [d.id, d]))
  let current = byId.get(docId)
  if (!current) return null
  const visited = new Set<string>()
  while (current.parentId) {
    if (visited.has(current.id)) break
    visited.add(current.id)
    const parent = byId.get(current.parentId)
    if (!parent) break
    current = parent
  }
  return current.id
}

export function getDocumentTabs(tree: DocumentNode[], activeDocId: string | null): DocumentNode[] {
  if (!activeDocId) return []

  const rootId = getDocumentRootId(tree, activeDocId)
  if (!rootId) return []

  const childrenByParent = new Map<string, DocumentNode[]>()
  tree.forEach((d) => {
    const parentKey = d.parentId ?? ''
    const list = childrenByParent.get(parentKey) ?? []
    list.push(d)
    childrenByParent.set(parentKey, list)
  })

  const result: DocumentNode[] = []
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    const node = tree.find((d) => d.id === id)
    if (!node) return
    result.push(node)
    const children = childrenByParent.get(id) ?? []
    children.forEach((child) => visit(child.id))
  }

  const rootChildren = childrenByParent.get(rootId) ?? []
  rootChildren.forEach((child) => visit(child.id))

  return result
}

export function getNextTabTitle(tree: DocumentNode[], rootId: string, prefix: string): string {
  const siblings = tree.filter((d) => d.parentId === rootId)
  return `${prefix} ${siblings.length + 1}`
}

export function getFirstTabId(tree: DocumentNode[], docId: string): string | null {
  const tabs = getDocumentTabs(tree, docId)
  return tabs[0]?.id ?? null
}
