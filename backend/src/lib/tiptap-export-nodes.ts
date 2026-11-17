type JsonNode = Record<string, unknown>

export function isNode(value: unknown): value is JsonNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function children(node: JsonNode): JsonNode[] {
  const content = node.content
  if (!Array.isArray(content)) return []
  return content.filter(isNode)
}

export function attrs(node: JsonNode): Record<string, unknown> {
  const a = node.attrs
  return isNode(a) ? a : {}
}

export function markNames(node: JsonNode): Set<string> {
  const marks = node.marks
  const names = new Set<string>()
  if (!Array.isArray(marks)) return names
  for (const mark of marks) {
    if (isNode(mark) && typeof mark.type === 'string') names.add(mark.type)
  }
  return names
}

export function linkHref(node: JsonNode): string | null {
  const marks = node.marks
  if (!Array.isArray(marks)) return null
  for (const mark of marks) {
    if (!isNode(mark) || mark.type !== 'link') continue
    const href = attrs(mark).href
    return typeof href === 'string' ? href : null
  }
  return null
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1')
}

export function tiptapToPlainText(content: unknown): string {
  if (!isNode(content)) return ''
  const parts: string[] = []
  const walk = (node: JsonNode) => {
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
      return
    }
    if (node.type === 'hardBreak') {
      parts.push('\n')
      return
    }
    if (node.type === 'horizontalRule') {
      parts.push('\n\n')
      return
    }
    children(node).forEach(walk)
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
      parts.push('\n\n')
    }
  }
  walk(content)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}
