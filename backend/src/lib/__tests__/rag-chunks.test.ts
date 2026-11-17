import { describe, expect, it } from 'vitest'
import { chunkPlainText, documentContentHash, RAG_CHUNK_CHARS } from '../rag-chunks.js'

describe('chunkPlainText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkPlainText('Alba llega a la plaza.')).toEqual(['Alba llega a la plaza.'])
  })

  it('covers the full manuscript with overlapping windows', () => {
    const body = `${'opening. '.repeat(80)}${'middle fact about the sapphire dragon. '.repeat(40)}${'ending. '.repeat(80)}`
    const chunks = chunkPlainText(body)
    expect(chunks.length).toBeGreaterThan(2)
    expect(chunks[0]).toContain('opening.')
    expect(chunks.join(' ')).toContain('sapphire dragon')
    expect(chunks.at(-1)).toContain('ending.')
    expect(chunks.every((chunk) => chunk.length <= RAG_CHUNK_CHARS)).toBe(true)
  })

  it('hashes title and body together', () => {
    expect(documentContentHash('A', 'text')).not.toBe(documentContentHash('B', 'text'))
  })
})
