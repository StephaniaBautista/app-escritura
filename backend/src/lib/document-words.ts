const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem', 'taskItem', 'tableRow', 'tableCell', 'tableHeader'])

export function visibleDocumentText(content: unknown): string {
  const separator = Symbol('separator')
  const pending: unknown[] = [content]
  const visited = new WeakSet<object>()
  const text: string[] = []
  while (pending.length) {
    const value = pending.pop()
    if (value === separator) { text.push('\n'); continue }
    if (!value || typeof value !== 'object' || Array.isArray(value) || visited.has(value)) continue
    visited.add(value)
    const node = value as Record<string, unknown>
    if (node.type === 'text' && typeof node.text === 'string') { text.push(node.text); continue }
    if (node.type === 'hardBreak' || node.type === 'horizontalRule') { text.push('\n'); continue }
    const block = typeof node.type === 'string' && blockTypes.has(node.type)
    if (block) { text.push('\n'); pending.push(separator) }
    if (Array.isArray(node.content)) {
      for (let index = node.content.length - 1; index >= 0; index--) pending.push(node.content[index])
    }
  }
  return text.join('').replace(/\s+/gu, ' ').trim()
}

export function countDocumentWords(content: unknown): number {
  return visibleDocumentText(content).split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
}
