import { Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { AiSuggestion } from '@/types/ai'

export const aiHighlightsKey = new PluginKey<DecorationSet>('aiHighlights')

export function findQuoteRanges(doc: Node, quote: string): { from: number; to: number }[] {
  if (!quote.trim()) return []
  let text = ''
  const positions: number[] = []
  doc.descendants((node, position) => {
    if (node.isTextblock && text) { text += '\n'; positions.push(position) }
    if (node.isText && node.text) {
      for (let index = 0; index < node.text.length; index += 1) { text += node.text[index]; positions.push(position + index) }
    }
    if (node.type.name === 'hardBreak') { text += '\n'; positions.push(position) }
  })
  const ranges: { from: number; to: number }[] = []
  let start = text.indexOf(quote)
  while (start !== -1 && ranges.length < 20) {
    ranges.push({ from: positions[start], to: positions[start + quote.length - 1] + 1 })
    start = text.indexOf(quote, start + quote.length)
  }
  return ranges
}

export const AiHighlights = Extension.create({
  name: 'aiHighlights',
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: aiHighlightsKey,
      state: {
        init: () => DecorationSet.empty,
        apply(transaction, previous) {
          const suggestions = transaction.getMeta(aiHighlightsKey) as AiSuggestion[] | undefined
          if (suggestions) {
            const decorations = suggestions.flatMap((suggestion) => findQuoteRanges(transaction.doc, suggestion.quote ?? '').map((range) => Decoration.inline(range.from, range.to, { class: 'ai-editor-highlight', title: suggestion.title, 'data-ai-suggestion': suggestion.id })))
            return DecorationSet.create(transaction.doc, decorations)
          }
          return transaction.docChanged ? DecorationSet.empty : previous
        },
      },
      props: { decorations: (state) => aiHighlightsKey.getState(state) },
    })]
  },
})
