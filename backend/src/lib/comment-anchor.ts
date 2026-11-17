interface TipTapNode {
  type?: unknown
  text?: unknown
  content?: unknown
}

function isNode(value: unknown): value is TipTapNode {
  return typeof value === 'object' && value !== null
}

function nodes(value: unknown): TipTapNode[] {
  return Array.isArray(value) ? value.filter(isNode) : []
}

export function blockText(node: TipTapNode): string {
  if (typeof node.text === 'string') return node.text
  return nodes(node.content).map(blockText).join('')
}

export function topLevelBlocks(content: unknown): TipTapNode[] {
  if (!isNode(content)) return []
  return nodes(content.content)
}

export function blocksText(content: unknown): string[] {
  return topLevelBlocks(content).map(blockText)
}

export interface BlockOutline {
  type: string
  text: string
}

export function blocksOutline(content: unknown): BlockOutline[] {
  return topLevelBlocks(content).map((node) => ({
    type: typeof node.type === 'string' ? node.type : 'paragraph',
    text: blockText(node),
  }))
}

export function quoteHead(text: string, max = 200): string {
  return text.trim().slice(0, max)
}

export interface AnchorMatch {
  blockIndex: number | null
  orphan: boolean
}

export function resolveAnchor(content: unknown, blockIndex: number, quote: string): AnchorMatch {
  const texts = blocksText(content)
  const needle = quote.trim()
  if (!needle) {
    const inRange = Number.isInteger(blockIndex) && blockIndex >= 0 && blockIndex < texts.length
    return { blockIndex: inRange ? blockIndex : null, orphan: !inRange }
  }
  const at = texts[blockIndex] ?? ''
  if (at.includes(needle)) return { blockIndex, orphan: false }
  const found = texts.findIndex((text) => text.includes(needle))
  return found >= 0 ? { blockIndex: found, orphan: false } : { blockIndex: null, orphan: true }
}
