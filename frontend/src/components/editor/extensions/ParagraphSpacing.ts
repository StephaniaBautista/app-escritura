import { Paragraph } from '@tiptap/extension-paragraph'

export type ParagraphSpacingValue = 'none' | 'md'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (attrs: { before?: ParagraphSpacingValue; after?: ParagraphSpacingValue }) => ReturnType
      unsetParagraphSpacing: () => ReturnType
    }
  }
}

export const ParagraphSpacing = Paragraph.extend({
  name: 'paragraph',

  addAttributes() {
    return {
      ...this.parent?.(),
      spacingBefore: {
        default: null,
        parseHTML: (element) => {
          const marginTop = element.style.marginTop
          return marginTop && marginTop !== '0px' ? 'md' : null
        },
        renderHTML: (attributes) => {
          if (attributes.spacingBefore !== 'md') return {}
          return { style: 'margin-top: 1.5em' }
        },
      },
      spacingAfter: {
        default: null,
        parseHTML: (element) => {
          const marginBottom = element.style.marginBottom
          return marginBottom && marginBottom !== '0px' ? 'md' : null
        },
        renderHTML: (attributes) => {
          if (attributes.spacingAfter !== 'md') return {}
          return { style: 'margin-bottom: 1.5em' }
        },
      },
    }
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (attrs) =>
        ({ commands }) => {
          const update: Record<string, string | null> = {}
          if (attrs.before !== undefined) update.spacingBefore = attrs.before
          if (attrs.after !== undefined) update.spacingAfter = attrs.after
          return commands.updateAttributes('paragraph', update)
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { spacingBefore: null, spacingAfter: null }),
    }
  },
})
