import { createHash } from 'node:crypto'

export const RAG_CHUNK_CHARS = 1000
export const RAG_CHUNK_OVERLAP = 150

export function chunkPlainText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  if (normalized.length <= RAG_CHUNK_CHARS) return [normalized]
  const chunks: string[] = []
  let start = 0
  while (start < normalized.length) {
    let end = Math.min(start + RAG_CHUNK_CHARS, normalized.length)
    if (end < normalized.length) {
      const window = normalized.slice(start, end)
      const paragraph = window.lastIndexOf('\n\n')
      const line = window.lastIndexOf('\n')
      const sentence = window.lastIndexOf('. ')
      const breakAt = Math.max(paragraph, line, sentence)
      if (breakAt >= RAG_CHUNK_CHARS / 2) {
        end = start + breakAt + (sentence === breakAt ? 2 : 1)
      }
    }
    const chunk = normalized.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= normalized.length) break
    start = Math.max(end - RAG_CHUNK_OVERLAP, start + 1)
  }
  return chunks
}

export function documentContentHash(title: string, text: string): string {
  return createHash('sha256').update(`${title}\n${text}`).digest('hex')
}
