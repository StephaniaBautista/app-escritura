import { describe, expect, it } from 'vitest'
import { countDocumentWords, visibleDocumentText } from '../document-words.js'

const text = (value: string) => ({ type: 'text', text: value })
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })
const document = (...content: unknown[]) => ({ type: 'doc', content })

describe('document visible word count', () => {
  it('joins inline text and separates blocks and hard breaks', () => {
    const content = document(paragraph(text('pala'), text('bra'), { type: 'hardBreak' }, text('dos')), paragraph(text('tres')))
    expect(visibleDocumentText(content)).toBe('palabra dos tres')
    expect(countDocumentWords(content)).toBe(3)
  })
  it('counts Unicode whitespace tokens containing letters or numbers', () => {
    expect(countDocumentWords(document(paragraph(text('café e\u0301l 123 中文 日本語 — … 🙂 hola,mundo co-autor\nuno\tdos'))))).toBe(9)
  })
  it('ignores image attributes, marks and malformed string children', () => {
    expect(countDocumentWords(document({ type: 'image', attrs: { alt: 'texto no visible' } }, paragraph('no contar', { ...text('visible'), marks: [{ attrs: { title: 'invisible' } }] })))).toBe(1)
  })
  it('counts the entire manuscript without the RAG cutoff', () => {
    expect(countDocumentWords(document(paragraph(text('palabra '.repeat(60_000)))))).toBe(60_000)
  })
  it('handles cyclic malformed JSON safely', () => {
    const node = { type: 'doc', content: [] as unknown[] }
    node.content.push(node, paragraph(text('uno')))
    expect(countDocumentWords(node)).toBe(1)
  })
  it.each([null, undefined, {}, 'not a document', []])('has zero visible words for %j', (content) => {
    expect(countDocumentWords(content)).toBe(0)
  })
})
