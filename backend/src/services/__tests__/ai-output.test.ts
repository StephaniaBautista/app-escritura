import { describe, expect, it } from 'vitest'
import { parseChatResponse, parseSuggestions } from '../ai-output.js'

const sources = [{ id: 'document:d1', type: 'document', title: 'Capítulo', excerpt: 'Ada tiene treinta años y teme al mar.' }]
const suggestion = { kind: 'character_completion', title: 'Edad', description: 'La edad está escrita.', sourceIds: ['document:d1'],
  field: 'age', value: 'treinta años', documentId: 'd1', quote: 'Ada tiene treinta años' }
function output(item: unknown) { return JSON.stringify({ suggestions: [item] }) }

describe('AI output boundaries', () => {
  it('accepts one structure suggestion per writing page', () => {
    const pages = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => ({
      id: `document:${id}`, type: 'document', title: id, excerpt: `Texto completo de ${id}.`,
    }))
    const items = pages.map((page) => ({
      kind: 'chapter_order', title: page.title, description: 'Colocar esta página.',
      sourceIds: [page.id], chapterId: page.id.replace('document:', ''), columnPhase: 'beginning',
    }))
    expect(parseSuggestions(JSON.stringify({ suggestions: items }), ['chapter_order'], pages)).toHaveLength(5)
  })
  it('accepts evidence-backed character extraction with a literal value', () => {
    expect(parseSuggestions(output(suggestion), ['character_completion'], sources, 'c1')).toEqual([
      expect.objectContaining({ field: 'age', value: 'treinta años', characterId: 'c1', documentId: 'd1' }),
    ])
  })
  it.each([
    { ...suggestion, sourceIds: ['document:foreign'] },
    { ...suggestion, quote: 'Ada tiene ochenta años' },
    { ...suggestion, quote: 'Ada [...] años' },
    { ...suggestion, value: 'ochenta años' },
    { ...suggestion, value: 'Treinta años' },
    { ...suggestion, value: '30 años' },
    { ...suggestion, documentId: 'foreign' },
    { ...suggestion, field: 'imageUrl' },
    { ...suggestion, field: '__proto__' },
    { ...suggestion, kind: 'apply' },
    { ...suggestion, sourceIds: [] },
  ])('rejects forged facts, sources and non-allowlisted fields', (item) => {
    expect(() => parseSuggestions(output(item), ['character_completion'], sources, 'c1')).toThrow('AI_INVALID_RESPONSE')
  })
  it('does not accept metadata as textual character evidence', () => {
    expect(() => parseSuggestions(output(suggestion), ['character_completion'], [{ ...sources[0], type: 'character' }], 'c1')).toThrow()
  })
  it('returns no suggestions when evidence is insufficient', () => {
    expect(parseSuggestions('{"suggestions":[]}', ['plot_hole'], [], undefined)).toEqual([])
  })
  it('omits a purely diagnostic character item while retaining fully evidenced candidates', () => {
    const diagnostic = { kind: 'character_completion', title: 'Conflicting age', description: 'Do not fill an ambiguous field.', sourceIds: ['document:d1'] }
    const result = parseSuggestions(JSON.stringify({ suggestions: [diagnostic, suggestion] }), ['character_completion'], sources, 'c1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ field: 'age', value: 'treinta años' })
    expect(() => parseSuggestions(output({ ...diagnostic, field: 'age' }), ['character_completion'], sources, 'c1')).toThrow('AI_INVALID_RESPONSE')
    expect(() => parseSuggestions(output({ ...suggestion, quote: 'Invented quote' }), ['character_completion'], sources, 'c1')).toThrow('AI_INVALID_RESPONSE')
    expect(() => parseSuggestions(JSON.stringify({ suggestions: Array.from({ length: 5 }, () => diagnostic) }), ['character_completion'], sources, 'c1')).toThrow('AI_INVALID_RESPONSE')
  })
  it('requires an exact anchor in the requested editor document', () => {
    const item = { kind: 'inconsistency', title: 'Edad contradictoria', description: 'Hay dos edades.', sourceIds: ['document:d1'], documentId: 'd1', quote: 'Ada tiene treinta años' }
    expect(parseSuggestions(output(item), ['inconsistency'], sources, undefined, 'd1')[0]).toMatchObject({ documentId: 'd1', quote: 'Ada tiene treinta años' })
    expect(() => parseSuggestions(output({ ...item, documentId: undefined, quote: undefined }), ['inconsistency'], sources, undefined, 'd1')).toThrow('AI_INVALID_RESPONSE')
    expect(() => parseSuggestions(output(item), ['inconsistency'], sources, undefined, 'different-active-document')).toThrow('AI_INVALID_RESPONSE')
    expect(parseSuggestions('{"suggestions":[]}', ['inconsistency'], sources, undefined, 'd1')).toEqual([])
  })
  it('permits unanchored global findings only when no active document was requested', () => {
    const item = { kind: 'plot_hole', title: 'Consecuencia abierta', description: 'Falta la consecuencia.', sourceIds: ['document:d1'] }
    expect(parseSuggestions(output(item), ['plot_hole'], sources)[0].documentId).toBeUndefined()
  })
  it('rejects excessive suggestion counts and long descriptions', () => {
    const item = { kind: 'plot_hole', title: 'Question', description: 'Evidence', sourceIds: ['document:d1'] }
    expect(() => parseSuggestions(JSON.stringify({ suggestions: Array.from({ length: 5 }, () => item) }), ['plot_hole'], sources)).toThrow('AI_INVALID_RESPONSE')
    expect(() => parseSuggestions(output({ ...item, description: 'x'.repeat(601) }), ['plot_hole'], sources)).toThrow('AI_INVALID_RESPONSE')
  })
  it('accepts a classified subplot and rejects fabricated classifications', () => {
    const item = { kind: 'subplot', title: 'Conexión', description: '¿Cómo se conecta?', sourceIds: ['document:d1'], relation: 'intertwined' }
    expect(parseSuggestions(output(item), ['subplot'], sources)[0].relation).toBe('intertwined')
    expect(() => parseSuggestions(output({ ...item, relation: 'main' }), ['subplot'], sources)).toThrow()
  })
  it('accepts chapter order suggestions tied to document sources', () => {
    const chapterSources = [{ id: 'document:ch-1', type: 'document', title: 'Capítulo 1', excerpt: 'El viaje comienza.' }]
    const item = { kind: 'chapter_order', title: 'Mover a desarrollo', description: 'El conflicto central aparece aquí.', sourceIds: ['document:ch-1'], chapterId: 'ch-1', columnPhase: 'development' }
    expect(parseSuggestions(output(item), ['chapter_order'], chapterSources)[0]).toMatchObject({ chapterId: 'ch-1', columnPhase: 'development' })
    expect(() => parseSuggestions(output({ ...item, columnPhase: 'middle' }), ['chapter_order'], chapterSources)).toThrow('AI_INVALID_RESPONSE')
  })
  it('converts validated advice into bounded plain text', () => {
    expect(parseChatResponse('{"observations":["Hay un conflicto."],"questions":["¿Qué desea?"],"nextSteps":[]}', 'adviser'))
      .toBe('• Hay un conflicto.\n\n• ¿Qué desea?')
  })
  it.each([
    '{"answer":"A chapter of prose"}',
    '{"observations":[],"questions":[],"nextSteps":[]}',
    '{"observations":["ok"],"questions":[],"nextSteps":[],"tool_calls":["write"]}',
    JSON.stringify({ observations: ['x'.repeat(351)], questions: [], nextSteps: [] }),
    '<script>window.location="elsewhere"</script>',
  ])('rejects unstructured or excessive model output', (content) => {
    expect(() => parseChatResponse(content, 'adviser')).toThrow('AI_INVALID_RESPONSE')
  })
  it('accepts a short character reply and rejects chapter-length replies', () => {
    expect(parseChatResponse('{"answer":"No lo sé.","knownFacts":[]}', 'character')).toBe('No lo sé.')
    expect(() => parseChatResponse(JSON.stringify({ answer: 'x'.repeat(1001), knownFacts: [] }), 'character')).toThrow()
  })
})
