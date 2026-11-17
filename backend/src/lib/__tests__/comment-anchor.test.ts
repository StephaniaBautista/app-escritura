import { describe, expect, it } from 'vitest'
import { blocksText, quoteHead, resolveAnchor } from '../comment-anchor.js'

const content = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Ada llega al puerto.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Capítulo dos' }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'El barco ' }, { type: 'text', text: 'zarpa al amanecer.' }],
    },
  ],
}

describe('comment-anchor', () => {
  it('collects top-level block texts', () => {
    expect(blocksText(content)).toEqual(['Ada llega al puerto.', 'Capítulo dos', 'El barco zarpa al amanecer.'])
  })

  it('returns empty blocks for malformed content', () => {
    expect(blocksText(null)).toEqual([])
    expect(blocksText({ type: 'doc' })).toEqual([])
    expect(blocksText('nope')).toEqual([])
  })

  it('truncates quotes', () => {
    expect(quoteHead('  ' + 'x'.repeat(300), 200)).toHaveLength(200)
    expect(quoteHead('  hola  ')).toBe('hola')
  })

  it('prefers the stored index when the quote still matches', () => {
    expect(resolveAnchor(content, 2, 'zarpa')).toEqual({ blockIndex: 2, orphan: false })
  })

  it('re-anchors by quote when the block moved', () => {
    expect(resolveAnchor(content, 0, 'zarpa')).toEqual({ blockIndex: 2, orphan: false })
  })

  it('falls back to the index when there is no quote', () => {
    expect(resolveAnchor(content, 1, '')).toEqual({ blockIndex: 1, orphan: false })
  })

  it('marks orphan comments when the quote disappeared', () => {
    expect(resolveAnchor(content, 0, 'texto borrado')).toEqual({ blockIndex: null, orphan: true })
    expect(resolveAnchor(content, 99, '')).toEqual({ blockIndex: null, orphan: true })
  })
})
