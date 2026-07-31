export function extractTextFromTiptap(json: Record<string, unknown> | null | undefined): string {
  if (!json || typeof json !== 'object') return ''
  const node = json as { type?: string; content?: unknown; text?: unknown }
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    return node.content
      .map((child) => extractTextFromTiptap(child as Record<string, unknown>))
      .join('')
  }
  if (node.type === 'paragraph') return '\n'
  if (node.type === 'heading') return '\n'
  return ''
}
