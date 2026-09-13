import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { AiHighlights, aiHighlightsKey, findQuoteRanges } from '../AiHighlights'
import { suggestion } from './fixtures'

describe('editor suggestion decorations', () => {
  it('locates exact text across formatted inline spans and rejects invented quotes', () => {
    const editor = new Editor({ extensions: [StarterKit, AiHighlights], content: '<p>Ana tenía <strong>veinte</strong> años.</p>' })
    const ranges = findQuoteRanges(editor.state.doc, 'Ana tenía veinte años.')
    expect(ranges).toHaveLength(1)
    expect(editor.state.doc.textBetween(ranges[0].from, ranges[0].to)).toBe('Ana tenía veinte años.')
    expect(findQuoteRanges(editor.state.doc, 'Ana tenía cuarenta años.')).toEqual([])
    editor.destroy()
  })
  it('clears highlights on typing and never persists AI metadata into the manuscript', () => {
    const editor = new Editor({ extensions: [StarterKit, AiHighlights], content: '<p>Ana tenía veinte años.</p>' })
    const before = editor.getJSON()
    editor.view.dispatch(editor.state.tr.setMeta(aiHighlightsKey, [suggestion]))
    expect(aiHighlightsKey.getState(editor.state)?.find()).toHaveLength(1)
    expect(editor.getJSON()).toEqual(before)
    editor.commands.insertContentAt(1, 'Hoy ')
    expect(aiHighlightsKey.getState(editor.state)?.find()).toHaveLength(0)
    expect(JSON.stringify(editor.getJSON())).not.toContain('ai-editor-highlight')
    editor.destroy()
  })
})
