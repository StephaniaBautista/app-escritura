import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ParagraphSpacing } from '../ParagraphSpacing'

const editors: Editor[] = []

function createEditor(): Editor {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      ParagraphSpacing,
    ],
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }],
    },
  })
  editors.push(editor)
  return editor
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
})

describe('ParagraphSpacing', () => {
  it('setParagraphSpacing aplica spacingBefore y lo renderiza como margin-top', () => {
    const editor = createEditor()

    editor.chain().focus().setParagraphSpacing({ before: 'md' }).run()

    expect(editor.getAttributes('paragraph').spacingBefore).toBe('md')
    expect(editor.getHTML()).toContain('margin-top: 1.5em')
  })

  it('setParagraphSpacing aplica spacingAfter y lo renderiza como margin-bottom', () => {
    const editor = createEditor()

    editor.chain().focus().setParagraphSpacing({ after: 'md' }).run()

    expect(editor.getAttributes('paragraph').spacingAfter).toBe('md')
    expect(editor.getHTML()).toContain('margin-bottom: 1.5em')
  })

  it('unsetParagraphSpacing elimina ambos atributos', () => {
    const editor = createEditor()

    editor.chain().focus().setParagraphSpacing({ before: 'md', after: 'md' }).run()
    editor.chain().focus().unsetParagraphSpacing().run()

    expect(editor.getAttributes('paragraph').spacingBefore).toBeNull()
    expect(editor.getAttributes('paragraph').spacingAfter).toBeNull()
    expect(editor.getHTML()).not.toContain('margin-top')
    expect(editor.getHTML()).not.toContain('margin-bottom')
  })

  it('parsea margin-top/margin-bottom desde HTML existente', () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ paragraph: false }),
        ParagraphSpacing,
      ],
      content: '<p style="margin-top: 1.5em; margin-bottom: 1.5em">Hola</p>',
    })
    editors.push(editor)

    expect(editor.getAttributes('paragraph').spacingBefore).toBe('md')
    expect(editor.getAttributes('paragraph').spacingAfter).toBe('md')
  })
})